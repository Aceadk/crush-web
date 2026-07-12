import { getAdminDb } from '@/lib/firebase-admin';
import { verifyCsrf } from '@/shared/lib/csrf';
import { checkRateLimit, getRateLimitKey } from '@/shared/lib/rate-limit';
import { verifySessionCookie } from '@/shared/lib/server-session';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, { apiVersion: '2023-10-16' });
  }

  return stripeClient;
}

function getReturnUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    throw new Error('Missing NEXT_PUBLIC_APP_URL');
  }

  return new URL('/settings/account', appUrl).toString();
}

async function getStripeCustomerId(uid: string): Promise<string | null> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(uid);

  // Billing identifiers are mirrored into the owner-only private account doc.
  // Prefer it so this route keeps working after the public-field cutover.
  const privateAccount = await userRef.collection('private').doc('account').get();
  const privateCustomerId = privateAccount.get('stripeCustomerId');
  if (typeof privateCustomerId === 'string' && privateCustomerId.startsWith('cus_')) {
    return privateCustomerId;
  }

  // Additive-migration fallback while legacy billing fields still exist on the
  // public user document. The browser never receives or supplies this value.
  const publicUser = await userRef.get();
  const legacyCustomerId = publicUser.get('stripeCustomerId');
  if (typeof legacyCustomerId === 'string' && legacyCustomerId.startsWith('cus_')) {
    return legacyCustomerId;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = verifyCsrf(request);
    if (csrfError) {
      return NextResponse.json({ error: csrfError }, { status: 403 });
    }

    const rateLimitKey = getRateLimitKey(request, 'billing-portal');
    const rateResult = await checkRateLimit(rateLimitKey, {
      limit: 10,
      windowSeconds: 15 * 60,
    });
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const authSession = await verifySessionCookie(request);
    if (!authSession) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const customerId = await getStripeCustomerId(authSession.uid);
    if (!customerId) {
      return NextResponse.json(
        { error: 'No Stripe billing account was found for this Crush account.' },
        { status: 409 }
      );
    }

    const portalSession = await getStripeClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: getReturnUrl(),
    });

    return NextResponse.json(
      { url: portalSession.url },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error creating Stripe Customer Portal session:', error);
    }
    return NextResponse.json(
      { error: 'Failed to open subscription management. Please try again.' },
      { status: 500 }
    );
  }
}
