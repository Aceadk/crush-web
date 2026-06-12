/**
 * Canonical entitlement resolver (P1 #7 of the web-mobile alignment audit).
 *
 * The BACKEND source of truth for entitlement is the `plan` field on the user
 * document (`'free' | 'plus'`), written by setUserPlan() and the
 * purchase-validation / Stripe-webhook paths in functions/src/index.ts. The
 * Firestore security rules also gate premium features on `plan == 'plus'`.
 *
 * Web historically read `isPremium` (boolean) and `subscriptionTier`, neither of
 * which the backend writes — so web premium gating was disconnected from real
 * entitlement. This module derives a single entitlement view from the canonical
 * `plan` field, with backward-compatible fallback to the legacy web fields so no
 * existing data is lost during the transition.
 *
 * See docs/reports/shared_backend_contract_matrix_2026-06-05.md (users schema).
 */

export type CanonicalPlan = 'free' | 'plus';
export type SubscriptionTier = 'free' | 'plus' | 'platinum';

export interface Entitlement {
  /** Canonical backend plan. */
  plan: CanonicalPlan;
  /** Convenience boolean derived from plan/tier. */
  isPremium: boolean;
  /** Display tier (web supports an extra 'platinum' marketing tier). */
  tier: SubscriptionTier;
  /** ISO expiry, if known. */
  expiresAt?: string;
  /** Lifecycle status from the backend subscriptionLifecycle, if present. */
  status?: string;
  /** Whether the subscription is set to cancel at period end. */
  cancelAtPeriodEnd?: boolean;
}

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  // Firestore Timestamp-like
  if (typeof value === 'object') {
    const v = value as { toDate?: () => Date; seconds?: number };
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    if (typeof v.seconds === 'number') {
      return new Date(v.seconds * 1000).toISOString();
    }
  }
  return undefined;
}

/**
 * Derive the canonical plan from a raw user document, preferring the backend
 * `plan` field and falling back to legacy web fields.
 */
export function resolvePlan(data: Record<string, unknown> | null | undefined): CanonicalPlan {
  if (!data) return 'free';

  // 1. Canonical backend field.
  const plan = typeof data.plan === 'string' ? data.plan.toLowerCase() : '';
  if (plan === 'plus' || plan === 'premium' || plan === 'platinum') return 'plus';
  if (plan === 'free') return 'free';

  // 2. Legacy web tier.
  const tier =
    typeof data.subscriptionTier === 'string'
      ? data.subscriptionTier.toLowerCase()
      : '';
  if (tier === 'plus' || tier === 'platinum' || tier === 'premium') return 'plus';

  // 3. Legacy boolean.
  if (data.isPremium === true) return 'plus';

  return 'free';
}

/**
 * Derive a display tier. Preserves the web-only 'platinum' marketing tier when
 * explicitly set; otherwise mirrors the canonical plan.
 */
export function resolveTier(
  data: Record<string, unknown> | null | undefined
): SubscriptionTier {
  const rawTier =
    typeof data?.subscriptionTier === 'string'
      ? data.subscriptionTier.toLowerCase()
      : '';
  if (rawTier === 'platinum') return 'platinum';
  return resolvePlan(data);
}

/**
 * Resolve the full entitlement view from a raw user document.
 */
export function resolveEntitlement(
  data: Record<string, unknown> | null | undefined
): Entitlement {
  const plan = resolvePlan(data);
  const tier = resolveTier(data);
  const lifecycle =
    (data?.subscriptionLifecycle as Record<string, unknown> | undefined) ?? undefined;

  return {
    plan,
    isPremium: plan === 'plus',
    tier,
    expiresAt:
      toIsoString(data?.subscriptionExpiresAt) ??
      toIsoString(data?.premiumExpiresAt) ??
      toIsoString(lifecycle?.currentPeriodEnd),
    status: typeof lifecycle?.status === 'string' ? lifecycle.status : undefined,
    cancelAtPeriodEnd:
      typeof lifecycle?.cancelAtPeriodEnd === 'boolean'
        ? lifecycle.cancelAtPeriodEnd
        : undefined,
  };
}

/** Convenience: is this user document entitled to premium features? */
export function isPremiumUser(
  data: Record<string, unknown> | null | undefined
): boolean {
  return resolvePlan(data) === 'plus';
}
