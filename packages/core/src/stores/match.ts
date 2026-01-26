import { create } from 'zustand';
import { matchService } from '../services/match';
import { Match, DiscoveryProfile, DiscoveryFilters, DEFAULT_DISCOVERY_FILTERS } from '../types/match';

interface MatchState {
  // State
  matches: Match[];
  discoveryProfiles: DiscoveryProfile[];
  currentProfileIndex: number;
  filters: DiscoveryFilters;
  loading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;

  // Actions
  loadMatches: (userId: string) => Promise<void>;
  subscribeToMatches: (userId: string) => void;
  loadDiscoveryProfiles: (userId: string) => Promise<void>;
  swipe: (userId: string, targetUserId: string, action: 'like' | 'pass' | 'superlike') => Promise<{ isMatch: boolean; matchId?: string }>;
  unmatch: (userId: string, matchId: string) => Promise<void>;
  togglePin: (matchId: string, pinned: boolean) => Promise<void>;
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
      const message = error instanceof Error ? error.message : 'Failed to load matches';
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
  loadDiscoveryProfiles: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const profiles = await matchService.getDiscoveryProfiles(userId, filters);
      set({ discoveryProfiles: profiles, currentProfileIndex: 0, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load profiles';
      set({ error: message, loading: false });
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
      const message = error instanceof Error ? error.message : 'Swipe failed';
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
      const message = error instanceof Error ? error.message : 'Unmatch failed';
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
      const message = error instanceof Error ? error.message : 'Pin toggle failed';
      set({ error: message });
    }
  },

  // Set filters
  setFilters: (newFilters) => {
    const { filters } = get();
    set({ filters: { ...filters, ...newFilters } });
  },

  // Navigate profiles
  nextProfile: () => {
    const { currentProfileIndex, discoveryProfiles } = get();
    if (currentProfileIndex < discoveryProfiles.length - 1) {
      set({ currentProfileIndex: currentProfileIndex + 1 });
    }
  },

  previousProfile: () => {
    const { currentProfileIndex } = get();
    if (currentProfileIndex > 0) {
      set({ currentProfileIndex: currentProfileIndex - 1 });
    }
  },

  // Cleanup subscriptions
  cleanup: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
