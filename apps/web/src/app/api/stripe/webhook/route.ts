import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

type PremiumPlan = 'monthly' | 'quarterly' | 'yearly';

// Billing period per price ID. Built from the SAME six `<tier>_<period>` vars the
// checkout route uses — previously this read a separate legacy trio
// (STRIPE_MONTHLY/QUARTERLY/YEARLY_PRICE_ID), so a price created for checkout was
// unknown here and the purchased period was recorded as undefined.
const PRICE_ID_TO_PLAN: Record<string, PremiumPlan> = {};
const PRICE_ENV_TO_PERIOD: Record<string, PremiumPlan> = {
  STRIPE_PLUS_MONTHLY_PRICE_ID: 'monthly',
  STRIPE_PLUS_QUARTERLY_PRICE_ID: 'quarterly',
  STRIPE_PLUS_YEARLY_PRICE_ID: 'yearly',
  STRIPE_PLATINUM_MONTHLY_PRICE_ID: 'monthly',
  STRIPE_PLATINUM_QUARTERLY_PRICE_ID: 'quarterly',
  STRIPE_PLATINUM_YEARLY_PRICE_ID: 'yearly',
};

for (const [envName, period] of Object.entries(PRICE_ENV_TO_PERIOD)) {
  const priceId = process.env[envName]?.trim();
  if (priceId) {
    PRICE_ID_TO_PLAN[priceId] = period;
  }
}

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  }
  return secret;
}

function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!customer) {
    return null;
  }
  if (typeof customer === 'string') {
    return customer;
  }
  if ('id' in customer && typeof customer.id === 'string') {
    return customer.id;
  }
  return null;
}

function extractSubscriptionId(
  subscription:
    | string
    | Stripe.Subscription
    | null
    | undefined
): string | null {
  if (!subscription) {
    return null;
  }
  if (typeof subscription === 'string') {
    return subscription;
  }
  return subscription.id;
}

function isPremiumStatus(status: Stripe.Subscription.Status): boolean {
  return (
    status === 'active' ||
    status === 'trialing' ||
    status === 'past_due'
  );
}

function resolvePremiumPlan(priceId?: string): PremiumPlan | undefined {
  if (!priceId) {
    return undefined;
  }
  return PRICE_ID_TO_PLAN[priceId];
}

async function resolveUserId(
  userIdHint: string | null,
  customerId: string | null
): Promise<string | null> {
  if (userIdHint) {
    return userIdHint;
  }
  if (!customerId) {
    return null;
  }

  const db = getAdminDb();

  // H-2: prefer the server-only reverse map (works after stripeCustomerId leaves
  // the public doc). Fall back to the legacy field query during the additive
  // phase while the field still exists on the public user doc.
  const mapSnap = await db.collection('stripe_customers').doc(customerId).get();
  const mappedUid = mapSnap.exists ? mapSnap.get('uid') : null;
  if (typeof mappedUid === 'string' && mappedUid) {
    return mappedUid;
  }

  const snapshot = await db
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0].id;
}

/**
 * H-2: mirror sensitive billing/entitlement fields into the owner-only private
 * doc (users/{uid}/private/account) and maintain the Stripe reverse-lookup map
 * (stripe_customers/{customerId} -> uid). Called alongside the public write so
 * the private store stays current before the cutover removes these fields from
 * the public doc. Non-breaking during the additive phase.
 */
async function mirrorBillingToPrivate(
  userId: string,
  customerId: string | null,
  fields: Record<string, unknown>
): Promise<void> {
  const db = getAdminDb();
  await db
    .collection('users')
    .doc(userId)
    .collection('private')
    .doc('account')
    .set({ ...fields, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

  if (customerId) {
    await db
      .collection('stripe_customers')
      .doc(customerId)
      .set(
        { uid: userId, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
  }
}

async function updateSubscriptionState(params: {
  userId: string;
  customerId: string | null;
  subscriptionId: string;
  status: Stripe.Subscription.Status;
  periodEndUnix: number | null;
  cancelAtPeriodEnd: boolean;
  plan: PremiumPlan | undefined;
}) {
  const db = getAdminDb();
  const isPremium = isPremiumStatus(params.status);
  const premiumExpiresAt =
    params.periodEndUnix != null
      ? new Date(params.periodEndUnix * 1000).toISOString()
      : null;

  const updates: Record<string, unknown> = {
    // Canonical entitlement fields (source of truth for rules + mobile).
    // Without these, a web Stripe purchase would NOT grant premium under the
    // Firestore rules (plan == 'plus') or on the mobile client. See
    // my_first_project/docs/reports/shared_backend_contract_matrix_2026-06-05.md.
    plan: isPremium ? 'plus' : 'free',
    subscriptionExpiresAt: premiumExpiresAt,
    subscriptionLifecycle: {
      provider: 'stripe',
      status: params.status,
      currentPeriodEnd: premiumExpiresAt,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd,
    },
    // Legacy web fields (kept for backward compatibility).
    isPremium,
    stripeSubscriptionId: params.subscriptionId,
    stripeCustomerId: params.customerId,
    stripeSubscriptionStatus: params.status,
    premiumAutoRenew: !params.cancelAtPeriodEnd,
    premiumExpiresAt,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (params.plan) {
    updates.premiumPlan = params.plan;
  }

  if (!isPremium) {
    updates.premiumPlan = null;
  }

  await db.collection('users').doc(params.userId).set(updates, { merge: true });
  // H-2: keep the owner-only private doc + Stripe map in sync with the public write.
  await mirrorBillingToPrivate(params.userId, params.customerId, updates);
}

async function updateSubscriptionDeleted(params: {
  userId: string;
  customerId: string | null;
  subscriptionId: string;
}) {
  const db = getAdminDb();
  const revoke: Record<string, unknown> = {
    // Canonical entitlement fields — revoke premium across rules + mobile.
    plan: 'free',
    subscriptionExpiresAt: null,
    subscriptionLifecycle: {
      provider: 'stripe',
      status: 'canceled',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    // Legacy web fields (kept for backward compatibility).
    isPremium: false,
    premiumPlan: null,
    premiumExpiresAt: null,
    premiumAutoRenew: false,
    stripeSubscriptionStatus: 'canceled',
    stripeSubscriptionId: params.subscriptionId,
    stripeCustomerId: params.customerId,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await db.collection('users').doc(params.userId).set(revoke, { merge: true });
  // H-2: keep the owner-only private doc + Stripe map in sync with the public write.
  await mirrorBillingToPrivate(params.userId, params.customerId, revoke);
}

async function processSubscriptionEvent(
  subscription: Stripe.Subscription,
  userIdHint?: string | null
) {
  const customerId = extractCustomerId(subscription.customer);
  const userId = await resolveUserId(userIdHint ?? null, customerId);
  if (!userId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[stripe-webhook] Could not resolve user for subscription',
        subscription.id
      );
    }
    return;
  }

  const plan = resolvePremiumPlan(subscription.items.data[0]?.price?.id);
  await updateSubscriptionState({
    userId,
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    periodEndUnix: subscription.current_period_end ?? null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    plan,
  });
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  const body = await request.text();
  let event: Stripe.Event;
  const db = getAdminDb();
  const stripe = getStripeClient();

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getWebhookSecret()
    );
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Webhook signature verification failed:', err);
    }
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  const eventRef = db.collection('stripe_webhook_events').doc(event.id);
  try {
    await eventRef.create({
      eventType: event.type,
      status: 'processing',
      createdAt: FieldValue.serverTimestamp(),
      stripeCreatedAt: event.created,
      livemode: event.livemode,
    });
  } catch (error) {
    const code = (error as { code?: number | string }).code;
    if (code === 6 || String(code) === 'already-exists') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw error;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userIdHint = session.metadata?.userId || session.client_reference_id;
        const subscriptionId = extractSubscriptionId(session.subscription);

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await processSubscriptionEvent(subscription, userIdHint);
        } else if (userIdHint) {
          const customerId = extractCustomerId(session.customer);
          await db.collection('users').doc(userIdHint).set(
            {
              stripeCustomerId: customerId,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await processSubscriptionEvent(
          subscription,
          subscription.metadata?.userId ?? null
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = extractCustomerId(subscription.customer);
        const userId = await resolveUserId(
          subscription.metadata?.userId ?? null,
          customerId
        );
        if (userId) {
          await updateSubscriptionDeleted({
            userId,
            customerId,
            subscriptionId: subscription.id,
          });
        }
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = extractSubscriptionId(invoice.subscription);

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = extractCustomerId(subscription.customer);
          const userId = await resolveUserId(
            subscription.metadata?.userId ?? null,
            customerId
          );

          if (userId) {
            await processSubscriptionEvent(subscription, userId);
            if (event.type === 'invoice.payment_failed') {
              await db.collection('users').doc(userId).set(
                {
                  stripeLastPaymentFailedAt: new Date().toISOString(),
                  updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true }
              );
            }
          }
        }
        break;
      }

      default:
        // Event intentionally ignored.
    }

    await eventRef.set(
      {
        status: 'processed',
        processedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    await eventRef.delete().catch(() => undefined);
    if (process.env.NODE_ENV === 'development') {
      console.error('Error processing webhook:', error);
    }
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
