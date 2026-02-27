import {
  Timestamp,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import { BoostStatus } from '../types/boost';

const USERS_COLLECTION = 'users';
const PREMIUM_BOOST_DURATION_MINUTES = 30;
const PREMIUM_BOOST_COOLDOWN_HOURS = 24 * 30; // 1 boost per 30 days

const BOOST_ERROR_MESSAGES = {
  premium_required: 'Boost is a Premium feature. Upgrade to activate boosts.',
  boost_active: 'You already have an active boost.',
  cooldown: 'Boost is on cooldown. Try again when your cooldown ends.',
  missing_profile: 'User profile not found.',
  unknown: 'Unable to activate boost right now.',
} as const;

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
    const isPremium = Boolean(data.isPremium);
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

  async activateBoost(userId: string): Promise<BoostStatus> {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, userId);
    const nowMs = Date.now();
    const boostExpiresAtMs = nowMs + this.durationMinutes * 60 * 1000;
    let statusFromTransaction: BoostStatus | null = null;

    await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const userData = userSnapshot.data() as Record<string, unknown> | undefined;
      const currentStatus = this.computeStatusFromUserData(userData);

      if (!currentStatus.canBoost) {
        const reason = currentStatus.unavailableReason ?? 'unknown';
        throw new Error(BOOST_ERROR_MESSAGES[reason] ?? BOOST_ERROR_MESSAGES.unknown);
      }

      transaction.update(userRef, {
        'boost.expiresAt': boostExpiresAtMs,
        'boost.activatedAt': Timestamp.fromMillis(nowMs),
        'boost.lastActivatedAt': Timestamp.fromMillis(nowMs),
        'boost.totalActivations': increment(1),
        'boost.updatedAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      statusFromTransaction = {
        canBoost: false,
        isActive: true,
        activeUntil: new Date(boostExpiresAtMs).toISOString(),
        cooldownUntil: new Date(
          nowMs + this.cooldownHours * 60 * 60 * 1000
        ).toISOString(),
        lastActivatedAt: new Date(nowMs).toISOString(),
        unavailableReason: 'boost_active',
        durationMinutes: this.durationMinutes,
        cooldownHours: this.cooldownHours,
      };
    });

    if (!statusFromTransaction) {
      throw new Error(BOOST_ERROR_MESSAGES.unknown);
    }

    return statusFromTransaction;
  }
}

export const boostService = new BoostService();
