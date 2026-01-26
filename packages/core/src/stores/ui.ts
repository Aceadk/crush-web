import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'match';
  title: string;
  description?: string;
  duration?: number;
}

interface Modal {
  id: string;
  type: string;
  props?: Record<string, unknown>;
}

interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Modals
  modals: Modal[];
  openModal: (type: string, props?: Record<string, unknown>) => void;
  closeModal: (id?: string) => void;
  closeAllModals: () => void;

  // Match animation
  showMatchAnimation: boolean;
  matchAnimationData: { userId: string; name: string; photo: string } | null;
  triggerMatchAnimation: (data: { userId: string; name: string; photo: string }) => void;
  hideMatchAnimation: () => void;

  // Loading states
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Mobile
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Toasts
      toasts: [],
      addToast: (toast) => {
        const id = `toast-${Date.now()}`;
        const newToast = { ...toast, id };
        set((state) => ({ toasts: [...state.toasts, newToast] }));

        // Auto-remove after duration
        const duration = toast.duration || 5000;
        setTimeout(() => {
          get().removeToast(id);
        }, duration);
      },
      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },
      clearToasts: () => set({ toasts: [] }),

      // Modals
      modals: [],
      openModal: (type, props) => {
        const id = `modal-${Date.now()}`;
        set((state) => ({
          modals: [...state.modals, { id, type, props }],
        }));
      },
      closeModal: (id) => {
        if (id) {
          set((state) => ({
            modals: state.modals.filter((m) => m.id !== id),
          }));
        } else {
          // Close the topmost modal
          set((state) => ({
            modals: state.modals.slice(0, -1),
          }));
        }
      },
      closeAllModals: () => set({ modals: [] }),

      // Match animation
      showMatchAnimation: false,
      matchAnimationData: null,
      triggerMatchAnimation: (data) => {
        set({ showMatchAnimation: true, matchAnimationData: data });
      },
      hideMatchAnimation: () => {
        set({ showMatchAnimation: false, matchAnimationData: null });
      },

      // Loading
      globalLoading: false,
      setGlobalLoading: (loading) => set({ globalLoading: loading }),

      // Mobile
      isMobile: false,
      setIsMobile: (isMobile) => set({ isMobile }),
    }),
    {
      name: 'crush-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
