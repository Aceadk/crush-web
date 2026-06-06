/**
 * MatchServiceV2 — canonical backend-aligned match service.
 *
 * Replaces the legacy `match.ts` swipe/match-creation logic (which wrote
 * directional `matches/{uid_otherid}` docs and `swipes/` directly). This service
 * reads from the canonical bidirectional `matches/{matchId}` model (matchId =
 * sorted uid1_uid2, with a `userIds` array) and routes swipe/unmatch mutations
 * through backend callables.
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
import { callables, type BackendMatchDTO } from '../api/callables';
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
      case 'archived':
      case 'cancelled':
        return 'unmatched';
      default:
        return 'mutual';
    }
  }

  /**
   * Map a canonical backend match doc (matches/{matchId}) to the web Match type.
   * Backend uses a `userIds` array + `participants` map; web's Match is
   * viewer-centric (userId = current user, otherUserId = the other participant).
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

    const participants =
      (data.participants as Record<
        string,
        Record<string, unknown>
      >) ?? {};
    const viewerParticipant = participants[viewerId] ?? {};

    return {
      id,
      userId: viewerId,
      otherUserId,
      status: this.mapStatus(data.status),
      preMatchMessageRequestsCount:
        typeof data.preMatchMessageRequestsCount === 'number'
          ? data.preMatchMessageRequestsCount
          : 0,
      pinnedForUser: Boolean(viewerParticipant.pinned),
      otherUserName: (data.otherUserName as string | undefined) ?? undefined,
      otherUserPhotoUrl:
        (data.otherUserPhotoUrl as string | undefined) ?? undefined,
      createdAt: this.toIsoString(data.createdAt),
      updatedAt: this.toIsoString(data.updatedAt),
      lastMessageAt: viewerParticipant.lastMessageAt
        ? this.toIsoString(viewerParticipant.lastMessageAt)
        : undefined,
      unreadCount:
        typeof viewerParticipant.unreadCount === 'number'
          ? viewerParticipant.unreadCount
          : 0,
      isSuperLike: Boolean(data.isSuperLike),
    };
  }

  /**
   * Map the backend match DTO returned by the swipeRight callable to the web
   * Match type.
   */
  private mapBackendDtoToMatch(dto: BackendMatchDTO, viewerId: string): Match {
    return this.mapDocToMatch(
      dto.id,
      dto as unknown as Record<string, unknown>,
      viewerId
    );
  }

  /**
   * Swipe right (like / superlike) via the backend `swipeRight` callable.
   * Returns the created Match if it resulted in a mutual match, else null.
   */
  async swipeRight(
    candidateId: string,
    message?: string
  ): Promise<{ isMatch: boolean; match: Match | null }> {
    const viewerId = this.requireUserId();
    const result = await callables.swipeRight({ candidateId, message });
    if (result.match) {
      return {
        isMatch: true,
        match: this.mapBackendDtoToMatch(result.match, viewerId),
      };
    }
    return { isMatch: false, match: null };
  }

  /**
   * Swipe left (pass) via the backend `swipeLeft` callable.
   */
  async swipeLeft(candidateId: string): Promise<void> {
    await callables.swipeLeft({ candidateId });
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
      orderBy('updatedAt', 'desc')
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
      orderBy('updatedAt', 'desc')
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
