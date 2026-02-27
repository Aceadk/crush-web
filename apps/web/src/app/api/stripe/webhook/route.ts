import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

type PremiumPlan = 'monthly' | 'quarterly' | 'yearly';

const PRICE_ID_TO_PLAN: Record<string, PremiumPlan> = {};
const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID?.trim();
const quarterlyPriceId = process.env.STRIPE_QUARTERLY_PRICE_ID?.trim();
const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID?.trim();

if (monthlyPriceId) {
  PRICE_ID_TO_PLAN[monthlyPriceId] = 'monthly';
}
if (quarterlyPriceId) {
  PRICE_ID_TO_PLAN[quarterlyPriceId] = 'quarterly';
}
if (yearlyPriceId) {
  PRICE_ID_TO_PLAN[yearlyPriceId] = 'yearly';
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
}

async function updateSubscriptionDeleted(params: {
  userId: string;
  customerId: string | null;
  subscriptionId: string;
}) {
  const db = getAdminDb();
  await db
    .collection('users')
    .doc(params.userId)
    .set(
      {
        isPremium: false,
        premiumPlan: null,
        premiumExpiresAt: null,
        premiumAutoRenew: false,
        stripeSubscriptionStatus: 'canceled',
        stripeSubscriptionId: params.subscriptionId,
        stripeCustomerId: params.customerId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
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
