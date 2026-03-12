import { verifyCsrf } from '@/shared/lib/csrf';
import { checkRateLimit, getRateLimitKey } from '@/shared/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const PRICE_IDS: Record<string, string> = {
  plus_monthly: process.env.STRIPE_PLUS_MONTHLY_PRICE_ID || 'price_plus_monthly',
  plus_quarterly: process.env.STRIPE_PLUS_QUARTERLY_PRICE_ID || 'price_plus_quarterly',
  plus_yearly: process.env.STRIPE_PLUS_YEARLY_PRICE_ID || 'price_plus_yearly',
  platinum_monthly: process.env.STRIPE_PLATINUM_MONTHLY_PRICE_ID || 'price_platinum_monthly',
  platinum_quarterly: process.env.STRIPE_PLATINUM_QUARTERLY_PRICE_ID || 'price_platinum_quarterly',
  platinum_yearly: process.env.STRIPE_PLATINUM_YEARLY_PRICE_ID || 'price_platinum_yearly',
};

export async function POST(request: NextRequest) {
  try {
    // CSRF protection — verify request origin
    const csrfError = verifyCsrf(request);
    if (csrfError) {
      return NextResponse.json({ error: csrfError }, { status: 403 });
    }

    // Rate limiting — 10 checkout attempts per 15 minutes per IP
    const rateLimitKey = getRateLimitKey(request, 'checkout');
    const rateResult = await checkRateLimit(rateLimitKey, { limit: 10, windowSeconds: 900 });
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

    // Verify auth token exists (middleware guards the route, but double-check here)
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { tier, period, userId, userEmail } = body;

    if (!tier || !period || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const priceKey = `${tier}_${period}`;
    const priceId = PRICE_IDS[priceKey];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid tier or period selected' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Build checkout session options
    // Promo codes are handled natively by Stripe — users enter them in the checkout UI.
    // This is more secure than accepting client-controlled discount percentages.
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      client_reference_id: userId,
      success_url: `${baseUrl}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/premium/cancel`,
      metadata: {
        userId,
        tier,
        period,
      },
      subscription_data: {
        metadata: {
          userId,
          tier,
          period,
        },
      },
    };

    const session = await stripe.checkout.sessions.create(sessionOptions);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error creating checkout session:', error);
    }
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
