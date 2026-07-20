import { create } from 'zustand';
import { errorText } from '../utils/errors';
import { matchService as legacyMatchService } from '../services/match';
import { matchServiceV2Adapter } from '../services/match_v2_adapter';
import { isV2ChatEnabled } from '../config/features';
import {
  Match,
  DiscoveryProfile,
  DiscoveryFilters,
  DEFAULT_DISCOVERY_FILTERS,
  DISCOVERY_EXTENDED_MAX_DISTANCE_KM,
} from '../types/match';

// Select the match backend once at module load (mirrors the message store).
// Gated by NEXT_PUBLIC_USE_V2_CHAT (default ON since the clean start).
const matchService = isV2ChatEnabled()
  ? matchServiceV2Adapter
  : legacyMatchService;

const DISCOVERY_RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
let discoveryRequestEpoch = 0;
let discoveryRequestInFlight: { key: string; promise: Promise<void> } | null = null;

function discoveryRequestKey(
  userId: string,
  filters: DiscoveryFilters,
  options: DiscoveryLoadOptions
): string {
  return JSON.stringify({ userId, filters, allowDistanceExpansion: options.allowDistanceExpansion });
}

function waitForDiscoveryRetry(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export interface DiscoveryLoadOptions {
  /** Match the app's one-time local-deck expansion when the saved radius is empty. */
  allowDistanceExpansion?: boolean;
}

interface MatchState {
  // State
  matches: Match[];
  discoveryProfiles: DiscoveryProfile[];
  currentProfileIndex: number;
  filters: DiscoveryFilters;
  discoveryOwnerUserId: string | null;
  discoveryLoading: boolean;
  discoveryRefreshing: boolean;
  discoveryError: string | null;
  localDeckExpanded: boolean;
  loading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;

  // Actions
  loadMatches: (userId: string) => Promise<void>;
  subscribeToMatches: (userId: string) => void;
  loadDiscoveryProfiles: (userId: string, options?: DiscoveryLoadOptions) => Promise<void>;
  swipe: (userId: string, targetUserId: string, action: 'like' | 'pass' | 'superlike') => Promise<{ isMatch: boolean; matchId?: string }>;
  unmatch: (userId: string, matchId: string) => Promise<void>;
  togglePin: (matchId: string, pinned: boolean) => Promise<void>;
  clearConversation: (matchId: string) => Promise<void>;
  setFilters: (filters: Partial<DiscoveryFilters>) => void;
  nextProfile: () => void;
  previousProfile: () => void;
  cleanup: () => void;
  clearError: () => void;
}

export const useMatchStore = create<MatchState>()((set, get) => ({
  // Initial state
  matches: [],
  discoveryProfiles: [],
  currentProfileIndex: 0,
  filters: DEFAULT_DISCOVERY_FILTERS,
  discoveryOwnerUserId: null,
  discoveryLoading: false,
  discoveryRefreshing: false,
  discoveryError: null,
  localDeckExpanded: false,
  loading: false,
  error: null,
  unsubscribe: null,

  // Load matches
  loadMatches: async (userId) => {
    set({ loading: true, error: null });
    try {
      const matches = await matchService.getMatches(userId, 'mutual');
      set({ matches, loading: false });
    } catch (error) {
      const message = errorText(error, 'Failed to load matches');
      set({ error: message, loading: false });
    }
  },

  // Subscribe to real-time match updates
  subscribeToMatches: (userId) => {
    const { unsubscribe: existingUnsub } = get();
    if (existingUnsub) {
      existingUnsub();
    }

    const unsubscribe = matchService.subscribeToMatches(userId, (matches) => {
      set({ matches });
    });

    set({ unsubscribe });
  },

  // Load discovery profiles
  loadDiscoveryProfiles: async (userId, options = {}) => {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) return;

    const filters = { ...get().filters };
    const requestKey = discoveryRequestKey(normalizedUserId, filters, options);
    if (discoveryRequestInFlight?.key === requestKey) {
      return discoveryRequestInFlight.promise;
    }

    const ownerChanged = get().discoveryOwnerUserId !== normalizedUserId;
    const hadDeck = !ownerChanged && get().discoveryProfiles.length > 0;
    const requestEpoch = ++discoveryRequestEpoch;

    set({
      ...(ownerChanged
        ? {
            discoveryProfiles: [],
            currentProfileIndex: 0,
            localDeckExpanded: false,
          }
        : {}),
      discoveryOwnerUserId: normalizedUserId,
      discoveryLoading: !hadDeck,
      discoveryRefreshing: hadDeck,
      discoveryError: null,
    });

    const promise = (async () => {
      let finalError: unknown;
      for (let attempt = 0; attempt <= DISCOVERY_RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          let profiles = await matchService.getDiscoveryProfiles(normalizedUserId, filters);
          let localDeckExpanded = false;

          // Flutter retries an empty local deck once at 500 km. Use the same
          // server endpoint and every same safety/preference rule; only the
          // radius changes for this second request.
          if (
            profiles.length === 0 &&
            options.allowDistanceExpansion !== false &&
            filters.maxDistance < DISCOVERY_EXTENDED_MAX_DISTANCE_KM
          ) {
            profiles = await matchService.getDiscoveryProfiles(normalizedUserId, {
              ...filters,
              maxDistance: DISCOVERY_EXTENDED_MAX_DISTANCE_KM,
            });
            localDeckExpanded = true;
          }

          if (
            requestEpoch !== discoveryRequestEpoch ||
            get().discoveryOwnerUserId !== normalizedUserId
          ) {
            return;
          }

          set({
            discoveryProfiles: profiles,
            currentProfileIndex: 0,
            discoveryLoading: false,
            discoveryRefreshing: false,
            discoveryError: null,
            localDeckExpanded,
          });
          return;
        } catch (error) {
          finalError = error;
          if (
            requestEpoch !== discoveryRequestEpoch ||
            get().discoveryOwnerUserId !== normalizedUserId
          ) {
            return;
          }
          if (attempt < DISCOVERY_RETRY_DELAYS_MS.length) {
            await waitForDiscoveryRetry(DISCOVERY_RETRY_DELAYS_MS[attempt]);
          }
        }
      }

      if (
        requestEpoch === discoveryRequestEpoch &&
        get().discoveryOwnerUserId === normalizedUserId
      ) {
        set({
          discoveryLoading: false,
          discoveryRefreshing: false,
          discoveryError: errorText(finalError, 'Failed to load profiles'),
        });
      }
    })();

    discoveryRequestInFlight = { key: requestKey, promise };
    try {
      await promise;
    } finally {
      if (discoveryRequestInFlight?.promise === promise) {
        discoveryRequestInFlight = null;
      }
    }
  },

  // Swipe action
  swipe: async (userId, targetUserId, action) => {
    set({ loading: true, error: null });
    try {
      const result = await matchService.swipe(userId, targetUserId, action);

      // Move to next profile
      const { discoveryProfiles, currentProfileIndex } = get();
      if (currentProfileIndex < discoveryProfiles.length - 1) {
        set({ currentProfileIndex: currentProfileIndex + 1, loading: false });
      } else {
        // Reload profiles when we run out
        await get().loadDiscoveryProfiles(userId);
      }

      // If it's a match, reload matches
      if (result.isMatch) {
        await get().loadMatches(userId);
      }

      return result;
    } catch (error) {
      const message = errorText(error, 'Swipe failed');
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Unmatch
  unmatch: async (userId, matchId) => {
    set({ loading: true, error: null });
    try {
      await matchService.unmatch(userId, matchId);

      // Remove from local state
      const { matches } = get();
      set({
        matches: matches.filter((m) => m.id !== matchId),
        loading: false,
      });
    } catch (error) {
      const message = errorText(error, 'Unmatch failed');
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Toggle pin
  togglePin: async (matchId, pinned) => {
    try {
      await matchService.togglePinMatch(matchId, pinned);

      // Update local state
      const { matches } = get();
      set({
        matches: matches.map((m) =>
          m.id === matchId ? { ...m, pinnedForUser: pinned } : m
        ),
      });
    } catch (error) {
      const message = errorText(error, 'Pin toggle failed');
      set({ error: message });
    }
  },

  // "Delete chat" — clears the thread for this user only. The match itself
  // survives (you are still matched), so the row stays on the matches page and
  // only the conversation list hides it.
  clearConversation: async (matchId) => {
    if (!('clearConversation' in matchService)) {
      throw new Error('Deleting a conversation requires the V2 chat backend.');
    }
    try {
      const clearedAt = await matchService.clearConversation(matchId);
      const { matches } = get();
      set({
        matches: matches.map((m) => (m.id === matchId ? { ...m, clearedAt } : m)),
      });
    } catch (error) {
      const message = errorText(error, 'Could not delete conversation');
      set({ error: message });
      throw error;
    }
  },

  // Set filters
  setFilters: (newFilters) => {
    const { filters } = get();
    const replacesCompleteFilterSet =
      newFilters.minAge !== undefined &&
      newFilters.maxAge !== undefined &&
      newFilters.maxDistance !== undefined;
    // A complete profile/dialog filter set replaces optional fields too. A
    // merge here retained the previous account's gender/interests flags when
    // the next account had no explicit values.
    set({
      filters: replacesCompleteFilterSet
        ? (newFilters as DiscoveryFilters)
        : { ...filters, ...newFilters },
    });
  },

  // Navigate profiles
  nextProfile: () => {
    const { currentProfileIndex, discoveryProfiles } = get();
    if (currentProfileIndex < discoveryProfiles.length - 1) {
      set({ currentProfileIndex: currentProfileIndex + 1 });
    }
  },

  // Rewind is NOT available on either platform.
  //
  // This used to just step the deck index back, which was misleading: the
  // swipe was already recorded server-side by then, so the "undone" profile
  // came back only as a local card and re-swiping it did nothing (or double
  // counted). There is no backend undo, and the mobile app disables rewind
  // outright (DiscoveryBloc._onRewindRequested -> rewindUnavailable), so web
  // now reports the same thing instead of faking it.
  previousProfile: () => {
    set({ error: 'Rewind is not available right now.' });
  },

  // Cleanup subscriptions
  cleanup: () => {
    discoveryRequestEpoch += 1;
    discoveryRequestInFlight = null;
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
    }
    set({
      unsubscribe: null,
      matches: [],
      discoveryProfiles: [],
      currentProfileIndex: 0,
      discoveryOwnerUserId: null,
      discoveryLoading: false,
      discoveryRefreshing: false,
      discoveryError: null,
      localDeckExpanded: false,
    });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
