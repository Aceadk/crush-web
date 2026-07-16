/**
 * MatchServiceV2 — canonical backend-aligned match service.
 *
 * Replaces the legacy `match.ts` swipe/match-creation logic (which wrote
 * directional `matches/{uid_otherid}` docs and `swipes/` directly). This service
 * reads from the canonical bidirectional `matches/{matchId}` model and routes
 * swipe/unmatch mutations through backend callables.
 *
 * Backend match schema (verified against functions/src/index.ts 2026-06-05):
 *   userIds: [uid1, uid2], status: 'active' | 'unmatched',
 *   preMatchRequests: { [uid]: n }, pinnedForUser: { [uid]: bool }, createdAt,
 *   lastMessageAt, lastMessageContent, lastMessageType, lastMessageFromUserId,
 *   readBy: { [uid]: ts }, typing: { [uid]: bool }.
 *
 * IMPORTANT: `swipeRight` returns only `{ matched, matchId? }` — NOT a full
 * match DTO. When a match is created we fetch the doc so callers still get a
 * Match.
 *
 * Discovery candidate fetching continues to use the REST `/v1/discovery/deck`
 * endpoint (already backend-driven via discovery_rest.ts).
 *
 * See:
 * - docs/reports/web_chat_match_migration_plan_2026-06-05.md (Option B)
 * - docs/reports/shared_backend_contract_matrix_2026-06-05.md
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '../firebase/config';
import { callables } from '../api/callables';
import { Match, MatchStatus } from '../types/match';
import { isLegacyEncryptedContent } from './legacy_cipher';

/** Chat-list previews never show raw legacy ciphertext. */
function maskLegacyPreview(preview: string | undefined): string | undefined {
  if (!preview) return preview;
  return isLegacyEncryptedContent(preview) ? '🔒 Message' : preview;
}

const MATCHES_COLLECTION = 'matches';

class MatchServiceV2 {
  private requireUserId(): string {
    const userId = getFirebaseAuth().currentUser?.uid;
    if (!userId) {
      throw new Error('User must be authenticated for match operations');
    }
    return userId;
  }

  private toIsoString(value: unknown): string {
    if (value instanceof Timestamp) {
      return value.toDate().toISOString();
    }
    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return new Date().toISOString();
  }

  /** Map canonical backend `status` to the web MatchStatus enum. */
  private mapStatus(status: unknown): MatchStatus {
    switch (status) {
      case 'active':
        return 'mutual';
      case 'unmatched':
        return 'unmatched';
      default:
        return 'mutual';
    }
  }

  /**
   * Map a canonical backend match doc (matches/{matchId}) to the web Match type.
   * Backend uses a `userIds` array + per-uid `pinnedForUser`/`preMatchRequests`
   * maps; web's Match is viewer-centric (userId = current user).
   *
   * NOTE: per-user unread count is not stored on the match doc; it is computed
   * by the backend at read time. We surface 0 here and rely on the per-chat
   * message subscription for unread state. (Follow-up: expose unread via a
   * dedicated field or callable if list badges are needed.)
   */
  private mapDocToMatch(id: string, data: Record<string, unknown>, viewerId: string): Match {
    const userIds = Array.isArray(data.userIds) ? (data.userIds as string[]) : [];
    const otherUserId = userIds.find((uid) => uid !== viewerId) ?? '';

    const pinnedForUser = (data.pinnedForUser as Record<string, boolean> | undefined) ?? {};
    const preMatchRequests = (data.preMatchRequests as Record<string, number> | undefined) ?? {};

    return {
      id,
      userId: viewerId,
      otherUserId,
      status: this.mapStatus(data.status),
      preMatchMessageRequestsCount: preMatchRequests[viewerId] ?? 0,
      pinnedForUser: Boolean(pinnedForUser[viewerId]),
      otherUserName: (data.otherUserName as string | undefined) ?? undefined,
      otherUserPhotoUrl: (data.otherUserPhotoUrl as string | undefined) ?? undefined,
      createdAt: this.toIsoString(data.createdAt),
      // Backend has no `updatedAt`; lastMessageAt is the freshest signal.
      updatedAt: this.toIsoString(data.lastMessageAt ?? data.createdAt),
      lastMessageAt: data.lastMessageAt ? this.toIsoString(data.lastMessageAt) : undefined,
      // Older mobile builds encrypted texts, so the denormalized preview can
      // be "enc_v1:..." ciphertext — mask it rather than showing gibberish.
      lastMessage: maskLegacyPreview((data.lastMessageContent as string | undefined) ?? undefined),
      unreadCount: 0,
      isSuperLike: Boolean(data.isSuperLike),
    };
  }

  /**
   * Swipe right (like / superlike) via the backend `swipeRight` callable.
   * Returns whether it created a mutual match plus the resolved Match (fetched
   * separately, since swipeRight returns only { matched, matchId }).
   */
  async swipeRight(
    targetUserId: string,
    attachedMessage?: string,
    superLike = false
  ): Promise<{ isMatch: boolean; matchId: string | null; match: Match | null }> {
    const result = await callables.swipeRight({
      targetUserId,
      attachedMessage,
      ...(superLike ? { superLike: true } : {}),
    });
    if (result.matched && result.matchId) {
      const match = await this.getMatch(result.matchId);
      return { isMatch: true, matchId: result.matchId, match };
    }
    return { isMatch: false, matchId: null, match: null };
  }

  /**
   * Swipe left (pass) via the backend `swipeLeft` callable.
   */
  async swipeLeft(targetUserId: string): Promise<void> {
    await callables.swipeLeft({ targetUserId });
  }

  /**
   * Unmatch via the backend `unmatch` callable.
   */
  async unmatch(matchId: string): Promise<void> {
    await callables.unmatch({ matchId });
  }

  /**
   * Pin/unpin a match for the current user via the backend `setMatchPinned`
   * callable (writes pinnedForUser.{uid} on the match doc).
   */
  async setPinned(matchId: string, pinned: boolean): Promise<void> {
    await callables.setMatchPinned({ matchId, pinned });
  }

  /**
   * Get all active matches for the current user.
   */
  async getMatches(): Promise<Match[]> {
    const viewerId = this.requireUserId();
    const db = getFirebaseDb();

    const q = query(
      collection(db, MATCHES_COLLECTION),
      where('userIds', 'array-contains', viewerId),
      where('status', '==', 'active'),
      orderBy('lastMessageAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const matches = snapshot.docs.map((d) => this.mapDocToMatch(d.id, d.data(), viewerId));
    return this.hydratePeerProfiles(matches);
  }

  /**
   * Subscribe to realtime match updates for the current user.
   */
  subscribeToMatches(callback: (matches: Match[]) => void): Unsubscribe {
    const viewerId = this.requireUserId();
    const db = getFirebaseDb();

    const q = query(
      collection(db, MATCHES_COLLECTION),
      where('userIds', 'array-contains', viewerId),
      where('status', '==', 'active'),
      orderBy('lastMessageAt', 'desc')
    );

    // Peer hydration is async; guard against an older snapshot resolving
    // after a newer one and delivering stale matches.
    let latestSnapshotSeq = 0;
    return onSnapshot(q, (snapshot) => {
      const seq = ++latestSnapshotSeq;
      const matches = snapshot.docs.map((d) => this.mapDocToMatch(d.id, d.data(), viewerId));
      // One row per person: historical swipe races created duplicate match
      // docs for the same pair. The query is newest-activity-first, so keeping
      // the first doc per peer makes every client converge on the same one.
      const seenPeers = new Set<string>();
      const deduped = matches.filter((m) => {
        const key = m.otherUserId.trim();
        if (!key) return true;
        if (seenPeers.has(key)) return false;
        seenPeers.add(key);
        return true;
      });
      void this.hydratePeerProfiles(deduped).then((hydrated) => {
        if (seq === latestSnapshotSeq) {
          callback(hydrated);
        }
      });
    });
  }

  /**
   * Get a single match by ID.
   */
  async getMatch(matchId: string): Promise<Match | null> {
    const viewerId = this.requireUserId();
    const db = getFirebaseDb();
    const snapshot = await getDoc(doc(db, MATCHES_COLLECTION, matchId));
    if (!snapshot.exists()) {
      return null;
    }
    const match = this.mapDocToMatch(snapshot.id, snapshot.data(), viewerId);
    const [hydrated] = await this.hydratePeerProfiles([match]);
    return hydrated;
  }

  /**
   * Fill otherUserName/otherUserPhotoUrl from the peer's user document.
   *
   * The backend match doc does NOT denormalize peer identity (swipeRight
   * writes only ids/status/timestamps), so without this every match rendered
   * as "Unknown" with an empty avatar. Mirrors the mobile app's
   * _hydrateCurrentMatchProfiles. Failures degrade to the raw match —
   * hydration must never break the matches list.
   */
  private async hydratePeerProfiles(matches: Match[]): Promise<Match[]> {
    const missing = matches.filter((m) => !m.otherUserName || !m.otherUserPhotoUrl);
    if (missing.length === 0) return matches;

    const db = getFirebaseDb();
    const uniquePeerIds = [...new Set(missing.map((m) => m.otherUserId))];
    const profileByUid = new Map<string, { name?: string; photoUrl?: string }>();

    await Promise.all(
      uniquePeerIds.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (!snap.exists()) return;
          const data = snap.data() as Record<string, unknown>;
          const profile = (data.profile ?? {}) as Record<string, unknown>;
          const photoUrls = Array.isArray(profile.photoUrls) ? (profile.photoUrls as string[]) : [];
          const primaryIndex =
            typeof profile.primaryPhotoIndex === 'number' ? profile.primaryPhotoIndex : 0;
          profileByUid.set(uid, {
            name: (profile.name as string | undefined) ?? (data.displayName as string | undefined),
            photoUrl:
              photoUrls[primaryIndex] ??
              photoUrls[0] ??
              (data.profilePhotoUrl as string | undefined),
          });
        } catch {
          // Blocked/hidden/deleted peers: leave the match unhydrated.
        }
      })
    );

    return matches.map((m) => {
      const peer = profileByUid.get(m.otherUserId);
      if (!peer) return m;
      return {
        ...m,
        otherUserName: m.otherUserName ?? peer.name,
        otherUserPhotoUrl: m.otherUserPhotoUrl ?? peer.photoUrl,
      };
    });
  }
}

export const matchServiceV2 = new MatchServiceV2();
export { MatchServiceV2 };
