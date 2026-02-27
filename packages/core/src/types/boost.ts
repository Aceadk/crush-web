/**
 * Boost feature types
 */

export type BoostUnavailableReason =
  | 'premium_required'
  | 'boost_active'
  | 'cooldown'
  | 'missing_profile'
  | 'unknown';

export interface BoostStatus {
  canBoost: boolean;
  isActive: boolean;
  activeUntil?: string;
  cooldownUntil?: string;
  lastActivatedAt?: string;
  unavailableReason?: BoostUnavailableReason;
  durationMinutes: number;
  cooldownHours: number;
}

export function getBoostActiveRemainingMs(
  status: BoostStatus | null,
  nowMs: number = Date.now()
): number {
  if (!status?.activeUntil) return 0;
  const activeUntilMs = Date.parse(status.activeUntil);
  if (Number.isNaN(activeUntilMs)) return 0;
  return Math.max(0, activeUntilMs - nowMs);
}

export function getBoostCooldownRemainingMs(
  status: BoostStatus | null,
  nowMs: number = Date.now()
): number {
  if (!status?.cooldownUntil) return 0;
  const cooldownUntilMs = Date.parse(status.cooldownUntil);
  if (Number.isNaN(cooldownUntilMs)) return 0;
  return Math.max(0, cooldownUntilMs - nowMs);
}
