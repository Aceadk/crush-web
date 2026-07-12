export interface StripeEventVersion {
  created: number;
  status?: string;
}

function stripeStatusPriority(status: string | undefined): number {
  switch (status) {
    case 'incomplete':
      return 10;
    case 'incomplete_expired':
      return 20;
    case 'trialing':
      return 30;
    case 'past_due':
      return 35;
    case 'active':
      return 40;
    case 'paused':
    case 'unpaid':
      return 45;
    case 'canceled':
      return 50;
    default:
      return 0;
  }
}

/**
 * Whether an incoming Stripe state may replace the stored state.
 *
 * Event creation time is the primary ordering key. Status priority only breaks
 * same-second ties, which Stripe can produce for checkout completion and the
 * resulting subscription update.
 */
export function shouldApplyStripeEvent(
  current: StripeEventVersion,
  incoming: StripeEventVersion
): boolean {
  if (incoming.created !== current.created) {
    return incoming.created > current.created;
  }

  return stripeStatusPriority(incoming.status) > stripeStatusPriority(current.status);
}
