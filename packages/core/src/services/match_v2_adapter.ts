/**
 * MatchServiceV2 adapter.
 *
 * Implements the subset of the legacy `matchService` surface that
 * `stores/match.ts` calls, routed to the canonical MatchServiceV2 (callables +
 * canonical matches/{matchId} reads).
 *
 * Discovery candidate fetching is already backend-driven (REST /v1/discovery/
 * deck via the legacy matchService), so it is delegated unchanged.
 */

import { matchService } from './match';
import { matchServiceV2 } from './match_v2';
import { DiscoveryFilters, DiscoveryProfile, Match, MatchStatus } from '../types/match';

export const matchServiceV2Adapter = {
  async getMatches(_userId: string, _status?: MatchStatus): Promise<Match[]> {
    // V2 reads active matches for the authenticated user; status/userId are
    // derived from the canonical model + auth context.
    return matchServiceV2.getMatches();
  },

  subscribeToMatches(_userId: string, callback: (matches: Match[]) => void) {
    return matchServiceV2.subscribeToMatches(callback);
  },

  // Discovery is already REST-backed; delegate to the legacy service unchanged.
  getDiscoveryProfiles(
    userId: string,
    filters: DiscoveryFilters,
    pageSize?: number
  ): Promise<DiscoveryProfile[]> {
    return matchService.getDiscoveryProfiles(userId, filters, pageSize);
  },

  async swipe(
    _userId: string,
    targetUserId: string,
    action: 'like' | 'pass' | 'superlike'
  ): Promise<{ isMatch: boolean; matchId?: string }> {
    if (action === 'pass') {
      await matchServiceV2.swipeLeft(targetUserId);
      return { isMatch: false };
    }
    const result = await matchServiceV2.swipeRight(targetUserId);
    return { isMatch: result.isMatch, matchId: result.matchId ?? undefined };
  },

  async unmatch(_userId: string, matchId: string): Promise<void> {
    await matchServiceV2.unmatch(matchId);
  },

  async togglePinMatch(matchId: string, pinned: boolean): Promise<void> {
    // Persisted via the backend setMatchPinned callable (writes
    // pinnedForUser.{uid} on the match doc).
    await matchServiceV2.setPinned(matchId, pinned);
  },
};

export type MatchServiceV2Adapter = typeof matchServiceV2Adapter;
