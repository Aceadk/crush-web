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
  private mapDocToMatch(
    id: string,
    data: Record<string, unknown>,
    viewerId: string
  ): Match {
    const userIds = Array.isArray(data.userIds)
      ? (data.userIds as string[])
      : [];
    const otherUserId = userIds.find((uid) => uid !== viewerId) ?? '';

    const pinnedForUser =
      (data.pinnedForUser as Record<string, boolean> | undefined) ?? {};
    const preMatchRequests =
      (data.preMatchRequests as Record<string, number> | undefined) ?? {};

    return {
      id,
      userId: viewerId,
      otherUserId,
      status: this.mapStatus(data.status),
      preMatchMessageRequestsCount: preMatchRequests[viewerId] ?? 0,
      pinnedForUser: Boolean(pinnedForUser[viewerId]),
      otherUserName: (data.otherUserName as string | undefined) ?? undefined,
      otherUserPhotoUrl:
        (data.otherUserPhotoUrl as string | undefined) ?? undefined,
      createdAt: this.toIsoString(data.createdAt),
      // Backend has no `updatedAt`; lastMessageAt is the freshest signal.
      updatedAt: this.toIsoString(data.lastMessageAt ?? data.createdAt),
      lastMessageAt: data.lastMessageAt
        ? this.toIsoString(data.lastMessageAt)
        : undefined,
      lastMessage: (data.lastMessageContent as string | undefined) ?? undefined,
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
    attachedMessage?: string
  ): Promise<{ isMatch: boolean; matchId: string | null; match: Match | null }> {
    const result = await callables.swipeRight({ targetUserId, attachedMessage });
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
    return snapshot.docs.map((d) =>
      this.mapDocToMatch(d.id, d.data(), viewerId)
    );
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

    return onSnapshot(q, (snapshot) => {
      const matches = snapshot.docs.map((d) =>
        this.mapDocToMatch(d.id, d.data(), viewerId)
      );
      callback(matches);
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
    return this.mapDocToMatch(snapshot.id, snapshot.data(), viewerId);
  }
}

export const matchServiceV2 = new MatchServiceV2();
export { MatchServiceV2 };
