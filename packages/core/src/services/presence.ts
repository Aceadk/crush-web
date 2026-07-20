import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';

/**
 * Presence, aligned 1:1 with the mobile app.
 *
 * Mobile and web write `presence/{uid} = { isOnline, lastSeen }`. Presence is
 * heartbeat-based: any active client keeps `lastSeen` fresh, while all stopped,
 * crashed, or signed-out clients naturally decay to offline after two minutes.
 * Avoiding explicit offline writes prevents one closed client from overriding
 * another client that is still active for the same account.
 *
 * Firestore rules: a user read/writes their OWN presence doc; reading a peer's
 * requires premium. A permission error on read therefore resolves to offline.
 *
 * The read is additionally gated by the peer's Activity-Status privacy
 * (`profile.privacySettings.showOnlineStatus`, deliberate v2 choices only),
 * mirroring the mobile watchPresence gate.
 */

const PRESENCE_COLLECTION = 'presence';
const USERS_COLLECTION = 'users';

/** Mirrors mobile FirebaseChatRepository.presenceFreshnessWindow (2 min). */
export const PRESENCE_FRESHNESS_MS = 2 * 60 * 1000;

/** Mirrors mobile AppPresenceCoordinator.heartbeatInterval (45s). */
export const PRESENCE_HEARTBEAT_MS = 45 * 1000;

function presenceLastSeenMs(data: Record<string, unknown> | undefined | null): number | undefined {
  const lastSeen = data?.lastSeen;
  return lastSeen instanceof Timestamp
    ? lastSeen.toMillis()
    : typeof lastSeen === 'number'
      ? lastSeen
      : undefined;
}

/**
 * Pure freshness decision, mirrors mobile `isPresenceOnline`. A recent
 * heartbeat is authoritative. The legacy `isOnline` flag is intentionally not
 * a gate: a false write from one closing client must not hide another active
 * app/web session for the same account.
 */
export function isPresenceOnline(
  data: Record<string, unknown> | undefined | null,
  nowMs: number
): boolean {
  const lastSeenMs = presenceLastSeenMs(data);
  if (lastSeenMs === undefined) return false;
  const ageMs = nowMs - lastSeenMs;
  return ageMs >= 0 && ageMs < PRESENCE_FRESHNESS_MS;
}

export const presenceService = {
  /** Write the current user's own presence heartbeat. */
  async setPresence(userId: string, isOnline: boolean): Promise<void> {
    const db = getFirebaseDb();
    await setDoc(
      doc(db, PRESENCE_COLLECTION, userId),
      { isOnline, lastSeen: serverTimestamp() },
      { merge: true }
    );
  },

  /**
   * Subscribe to a peer's online state. Resolves offline when the peer hid
   * their Activity Status, when presence is stale, or when the read is denied
   * (non-premium). Returns an unsubscribe function.
   */
  subscribeToPresence(peerId: string, callback: (online: boolean) => void): () => void {
    const db = getFirebaseDb();
    let cancelled = false;
    let unsub: (() => void) | null = null;
    let expiryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearExpiryTimer = () => {
      if (expiryTimer) clearTimeout(expiryTimer);
      expiryTimer = null;
    };

    const publishPresence = (data: Record<string, unknown> | undefined) => {
      clearExpiryTimer();
      if (cancelled) return;

      const nowMs = Date.now();
      const online = isPresenceOnline(data, nowMs);
      callback(online);
      const lastSeenMs = presenceLastSeenMs(data);
      if (!online || lastSeenMs === undefined) return;

      // Firestore does not emit another snapshot merely because wall-clock
      // time advanced. Schedule the exact freshness boundary so a crashed or
      // hidden client changes to offline without requiring another write.
      const remainingMs = PRESENCE_FRESHNESS_MS - (nowMs - lastSeenMs);
      expiryTimer = setTimeout(() => publishPresence(data), remainingMs + 10);
    };

    void (async () => {
      // Activity-Status privacy gate: a deliberate opt-out (v2) is always
      // shown as offline, regardless of the real presence doc.
      try {
        const userSnap = await getDoc(doc(db, USERS_COLLECTION, peerId));
        const profile = userSnap.data()?.profile as Record<string, unknown> | undefined;
        const privacy = profile?.privacySettings as Record<string, unknown> | undefined;
        const isDeliberate =
          typeof privacy?.privacySchemaVersion === 'number' && privacy.privacySchemaVersion >= 2;
        if (isDeliberate && privacy?.showOnlineStatus === false) {
          if (!cancelled) callback(false);
          return;
        }
      } catch {
        // Privacy unreadable → fall through to presence.
      }
      if (cancelled) return;
      unsub = onSnapshot(
        doc(db, PRESENCE_COLLECTION, peerId),
        (snap) => {
          publishPresence(snap.data());
        },
        () => {
          // Permission denied (non-premium reader) or transient error → offline.
          clearExpiryTimer();
          if (!cancelled) callback(false);
        }
      );
    })();

    return () => {
      cancelled = true;
      clearExpiryTimer();
      if (unsub) unsub();
    };
  },
};

export type PresenceService = typeof presenceService;
