import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirebaseDb } from '@crush/core';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function updateUserPremiumStatus(
  userId: string,
  isPremium: boolean,
  subscriptionId?: string,
  subscriptionEndDate?: Date
) {
  const db = getFirebaseDb();

  await updateDoc(doc(db, 'users', userId), {
    isPremium,
    stripeSubscriptionId: subscriptionId || null,
    premiumExpiresAt: subscriptionEndDate?.toISOString() || null,
    updatedAt: serverTimestamp(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const endDate = new Date(subscription.current_period_end * 1000);

          await updateUserPremiumStatus(
            userId,
            true,
            subscription.id,
            endDate
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const isActive = subscription.status === 'active';
          const endDate = new Date(subscription.current_period_end * 1000);

          await updateUserPremiumStatus(
            userId,
            isActive,
            subscription.id,
            endDate
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await updateUserPremiumStatus(userId, false);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;

          if (userId) {
            // Keep premium for now, but log the failed payment
            console.log(`Payment failed for user ${userId}, subscription ${subscriptionId}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
