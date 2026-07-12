import { describe, expect, it } from 'vitest';
import { shouldApplyStripeEvent } from '../stripe/stripe-event-ordering';

describe('Stripe webhook event ordering', () => {
  it('allows a newer active event to replace an incomplete event', () => {
    expect(
      shouldApplyStripeEvent(
        { created: 100, status: 'incomplete' },
        { created: 102, status: 'active' }
      )
    ).toBe(true);
  });

  it('rejects an older incomplete event after an active event', () => {
    expect(
      shouldApplyStripeEvent(
        { created: 102, status: 'active' },
        { created: 100, status: 'incomplete' }
      )
    ).toBe(false);
  });

  it('uses status progression to break same-second delivery races', () => {
    expect(
      shouldApplyStripeEvent(
        { created: 102, status: 'incomplete' },
        { created: 102, status: 'active' }
      )
    ).toBe(true);
    expect(
      shouldApplyStripeEvent(
        { created: 102, status: 'active' },
        { created: 102, status: 'incomplete' }
      )
    ).toBe(false);
  });

  it('treats an identical event version as idempotent', () => {
    expect(
      shouldApplyStripeEvent({ created: 102, status: 'active' }, { created: 102, status: 'active' })
    ).toBe(false);
  });
});
