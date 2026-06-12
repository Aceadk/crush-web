import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import { BoostStatus } from '../types/boost';
import { isPremiumUser } from './entitlement';
import { callables } from '../api/callables';

const USERS_COLLECTION = 'users';
const PREMIUM_BOOST_DURATION_MINUTES = 30;
const PREMIUM_BOOST_COOLDOWN_HOURS = 24 * 30; // 1 boost per 30 days

type BoostDoc = Record<string, unknown>;

function toMillis(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const asDate = (value as { toDate: () => Date }).toDate();
    const ms = asDate.getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  return null;
}

function toIso(ms: number | null): string | undefined {
  if (ms === null) return undefined;
  return new Date(ms).toISOString();
}

class BoostService {
  private readonly durationMinutes = PREMIUM_BOOST_DURATION_MINUTES;
  private readonly cooldownHours = PREMIUM_BOOST_COOLDOWN_HOURS;

  private computeStatusFromUserData(data: Record<string, unknown> | undefined): BoostStatus {
    if (!data) {
      return {
        canBoost: false,
        isActive: false,
        unavailableReason: 'missing_profile',
        durationMinutes: this.durationMinutes,
        cooldownHours: this.cooldownHours,
      };
    }

    const nowMs = Date.now();
    // Derive from canonical `plan` (backend never writes `isPremium`).
    const isPremium = isPremiumUser(data);
    const boost = (data.boost ?? {}) as BoostDoc;

    const expiresAtMs = toMillis(boost.expiresAt);
    const activatedAtMs =
      toMillis(boost.lastActivatedAt) ??
      toMillis(boost.activatedAt) ??
      (expiresAtMs !== null ? expiresAtMs - this.durationMinutes * 60 * 1000 : null);
    const activeUntilMs =
      expiresAtMs !== null && expiresAtMs > nowMs ? expiresAtMs : null;
    const cooldownUntilMs =
      activatedAtMs !== null
        ? activatedAtMs + this.cooldownHours * 60 * 60 * 1000
        : null;

    if (activeUntilMs !== null) {
      return {
        canBoost: false,
        isActive: true,
        activeUntil: toIso(activeUntilMs),
        cooldownUntil: toIso(cooldownUntilMs),
        lastActivatedAt: toIso(activatedAtMs),
        unavailableReason: 'boost_active',
        durationMinutes: this.durationMinutes,
        cooldownHours: this.cooldownHours,
      };
    }

    if (!isPremium) {
      return {
        canBoost: false,
        isActive: false,
        cooldownUntil: toIso(cooldownUntilMs),
        lastActivatedAt: toIso(activatedAtMs),
        unavailableReason: 'premium_required',
        durationMinutes: this.durationMinutes,
        cooldownHours: this.cooldownHours,
      };
    }

    if (cooldownUntilMs !== null && cooldownUntilMs > nowMs) {
      return {
        canBoost: false,
        isActive: false,
        cooldownUntil: toIso(cooldownUntilMs),
        lastActivatedAt: toIso(activatedAtMs),
        unavailableReason: 'cooldown',
        durationMinutes: this.durationMinutes,
        cooldownHours: this.cooldownHours,
      };
    }

    return {
      canBoost: true,
      isActive: false,
      cooldownUntil: toIso(cooldownUntilMs),
      lastActivatedAt: toIso(activatedAtMs),
      durationMinutes: this.durationMinutes,
      cooldownHours: this.cooldownHours,
    };
  }

  async getBoostStatus(userId: string): Promise<BoostStatus> {
    const db = getFirebaseDb();
    const userSnapshot = await getDoc(doc(db, USERS_COLLECTION, userId));
    return this.computeStatusFromUserData(userSnapshot.data() as Record<string, unknown> | undefined);
  }

  /**
   * Activate a boost via the backend activateBoost callable. The server owns
   * eligibility (Plus check) and cooldown enforcement and writes the protected
   * `boost.*` fields — the Firestore rules reject direct client writes to them,
   * so a modified client cannot self-grant a boost or bypass the cooldown.
   */
  async activateBoost(_userId?: string): Promise<BoostStatus> {
    const result = await callables.activateBoost();
    return {
      canBoost: false,
      isActive: result.isActive,
      activeUntil: result.activeUntil,
      cooldownUntil: result.cooldownUntil,
      lastActivatedAt: result.lastActivatedAt,
      unavailableReason: 'boost_active',
      durationMinutes: result.durationMinutes,
      cooldownHours: result.cooldownHours,
    };
  }
}

export const boostService = new BoostService();
