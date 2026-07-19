import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';

/**
 * Presence, aligned 1:1 with the mobile app.
 *
 * Mobile writes `presence/{uid} = { isOnline, lastSeen }` and treats a peer as
 * online only if `isOnline === true` AND `lastSeen` is within a 2-minute
 * freshness window (so a crashed/closed client that never wrote `false` decays
 * to offline). A heartbeat refreshes `lastSeen` every 45s while active.
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

/** Mirrors mobile ChatBloc.presenceHeartbeatInterval (45s). */
export const PRESENCE_HEARTBEAT_MS = 45 * 1000;

/**
 * Pure freshness decision, mirrors mobile `isPresenceOnline`. Online iff the
 * doc is flagged online and its `lastSeen` is within the freshness window of
 * `nowMs`.
 */
export function isPresenceOnline(
  data: Record<string, unknown> | undefined | null,
  nowMs: number,
): boolean {
  if (!data) return false;
  if (data.isOnline !== true) return false;
  const lastSeen = data.lastSeen;
  const lastSeenMs =
    lastSeen instanceof Timestamp
      ? lastSeen.toMillis()
      : typeof lastSeen === 'number'
        ? lastSeen
        : undefined;
  if (lastSeenMs === undefined) return false;
  return nowMs - lastSeenMs < PRESENCE_FRESHNESS_MS;
}

export const presenceService = {
  /** Write the current user's own presence heartbeat. */
  async setPresence(userId: string, isOnline: boolean): Promise<void> {
    const db = getFirebaseDb();
    await setDoc(
      doc(db, PRESENCE_COLLECTION, userId),
      { isOnline, lastSeen: serverTimestamp() },
      { merge: true },
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

    void (async () => {
      // Activity-Status privacy gate: a deliberate opt-out (v2) is always
      // shown as offline, regardless of the real presence doc.
      try {
        const userSnap = await getDoc(doc(db, USERS_COLLECTION, peerId));
        const profile = userSnap.data()?.profile as Record<string, unknown> | undefined;
        const privacy = profile?.privacySettings as Record<string, unknown> | undefined;
        const isDeliberate =
          typeof privacy?.privacySchemaVersion === 'number' &&
          privacy.privacySchemaVersion >= 2;
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
          if (!cancelled) callback(isPresenceOnline(snap.data(), Date.now()));
        },
        () => {
          // Permission denied (non-premium reader) or transient error → offline.
          if (!cancelled) callback(false);
        },
      );
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  },
};

export type PresenceService = typeof presenceService;
