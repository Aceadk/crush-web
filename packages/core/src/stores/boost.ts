import { create } from 'zustand';
import { errorText } from '../utils/errors';
import { boostService } from '../services/boost';
import { BoostStatus } from '../types/boost';

interface BoostState {
  status: BoostStatus | null;
  loading: boolean;
  activating: boolean;
  error: string | null;
  loadStatus: (userId: string) => Promise<void>;
  activateBoost: (userId: string) => Promise<BoostStatus>;
  clearError: () => void;
}

export const useBoostStore = create<BoostState>()((set) => ({
  status: null,
  loading: false,
  activating: false,
  error: null,

  loadStatus: async (userId) => {
    set({ loading: true, error: null });
    try {
      const status = await boostService.getBoostStatus(userId);
      set({ status, loading: false });
    } catch (error) {
      const message =
        errorText(error, 'Failed to load boost status');
      set({ error: message, loading: false });
    }
  },

  activateBoost: async (userId) => {
    set({ activating: true, error: null });
    try {
      const status = await boostService.activateBoost(userId);
      set({ status, activating: false });
      return status;
    } catch (error) {
      const message =
        errorText(error, 'Failed to activate boost');
      set({ error: message, activating: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
