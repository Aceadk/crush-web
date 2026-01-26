import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from 'firebase/auth';
import { authService } from '../services/auth';
import { userService } from '../services/user';
import { UserProfile } from '../types/user';

// Helper to set auth cookie for middleware
const setAuthCookie = async (user: User | null) => {
  if (typeof document === 'undefined') return;

  if (user) {
    try {
      const token = await user.getIdToken();
      // Set cookie with 7 day expiry, secure in production
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `auth-token=${token}; path=/; expires=${expires}; SameSite=Lax${secure}`;
    } catch (error) {
      console.error('Failed to set auth cookie:', error);
    }
  } else {
    // Remove cookie
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
};

interface AuthState {
  // State
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // Actions
  initialize: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  startPhoneVerification: (phoneNumber: string, recaptchaContainerId: string) => Promise<void>;
  verifyPhoneCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      profile: null,
      loading: false,
      error: null,
      initialized: false,

      // Initialize auth listener
      initialize: () => {
        if (get().initialized) return;

        authService.onAuthStateChange(async (user) => {
          set({ user, loading: true });

          // Set or remove auth cookie for middleware
          await setAuthCookie(user);

          if (user) {
            try {
              let profile = await userService.getUserProfile(user.uid);

              // Create profile if it doesn't exist
              if (!profile) {
                profile = await userService.createUserProfile(user.uid, {
                  email: user.email || undefined,
                  phoneNumber: user.phoneNumber || undefined,
                  displayName: user.displayName || '',
                  profilePhotoUrl: user.photoURL || undefined,
                });
              }

              // Update last active
              await userService.updateLastActive(user.uid);

              set({ profile, loading: false, initialized: true });
            } catch (error) {
              console.error('Failed to load profile:', error);
              set({ loading: false, initialized: true });
            }
          } else {
            set({ profile: null, loading: false, initialized: true });
          }
        });
      },

      // Sign in with email
      signInWithEmail: async (email, password) => {
        set({ loading: true, error: null });
        try {
          await authService.signInWithEmail(email, password);
          // Note: onAuthStateChange will set the user and profile
          // We set loading: false here to ensure UI doesn't hang
          set({ loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Sign in failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // Sign up with email
      signUpWithEmail: async (email, password, displayName) => {
        set({ loading: true, error: null });
        try {
          const user = await authService.signUpWithEmail(email, password, displayName);

          // Create user profile
          const profile = await userService.createUserProfile(user.uid, {
            email,
            displayName: displayName || '',
          });

          set({ profile, loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Sign up failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // Sign in with Google
      signInWithGoogle: async () => {
        set({ loading: true, error: null });
        try {
          await authService.signInWithGoogle();
          set({ loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Google sign in failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // Start phone verification
      startPhoneVerification: async (phoneNumber, recaptchaContainerId) => {
        set({ loading: true, error: null });
        try {
          await authService.startPhoneVerification(phoneNumber, recaptchaContainerId);
          set({ loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Phone verification failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // Verify phone code
      verifyPhoneCode: async (code) => {
        set({ loading: true, error: null });
        try {
          const user = await authService.verifyPhoneCode(code);

          // Create or get profile
          let profile = await userService.getUserProfile(user.uid);
          if (!profile) {
            profile = await userService.createUserProfile(user.uid, {
              phoneNumber: user.phoneNumber || undefined,
            });
          }

          set({ profile, loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Code verification failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // Sign out
      signOut: async () => {
        set({ loading: true, error: null });
        try {
          const { user } = get();
          if (user) {
            await userService.setUserOffline(user.uid);
          }
          await authService.signOut();
          // Ensure cookie is removed
          await setAuthCookie(null);
          set({ user: null, profile: null, loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Sign out failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // Send password reset
      sendPasswordReset: async (email) => {
        set({ loading: true, error: null });
        try {
          await authService.sendPasswordReset(email);
          set({ loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Password reset failed';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // Refresh profile
      refreshProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const profile = await userService.getUserProfile(user.uid);
          set({ profile });
        } catch (error) {
          console.error('Failed to refresh profile:', error);
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'crush-auth',
      partialize: (state) => ({
        // Only persist minimal data
        initialized: state.initialized,
      }),
    }
  )
);
