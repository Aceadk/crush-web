import { create } from 'zustand';
import { User } from 'firebase/auth';
import { authService } from '../services/auth';
import { getAuthErrorMessage } from '../services/auth_errors';
import { userService } from '../services/user';
import { deviceSecurityService, TrustedDevice } from '../services/device-security';
import { UserProfile } from '../types/user';
import { isFirebaseConfigured } from '../firebase/config';

const REMEMBER_ME_STORAGE_KEY = 'crush.rememberMe';
const AUTH_COOKIE_NAME = 'auth-token';
const LAST_ACTIVE_COOKIE_NAME = 'session-last-active';
const REMEMBER_ME_COOKIE_NAME = 'session-remember-me';
const DEFAULT_REMEMBER_ME = true;

let pendingRememberMePreference: boolean | null = null;

function readRememberMePreference(): boolean {
  if (typeof window === 'undefined') {
    return DEFAULT_REMEMBER_ME;
  }

  const stored = window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY);
  if (stored === '1') return true;
  if (stored === '0') return false;
  return DEFAULT_REMEMBER_ME;
}

function writeRememberMePreference(rememberMe: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, rememberMe ? '1' : '0');
}

// Helper to clear auth cookie via server-side API (HttpOnly)
const clearAuthCookie = async () => {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch {
    // Fallback: clear via document.cookie for non-HttpOnly legacy cookies.
    for (const name of [AUTH_COOKIE_NAME, LAST_ACTIVE_COOKIE_NAME, REMEMBER_ME_COOKIE_NAME]) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
};

// Helper to set auth cookie via server-side API (HttpOnly)
const setAuthCookie = async (
  user: User | null,
  options?: { forceRefresh?: boolean; rememberMe?: boolean }
) => {
  if (typeof window === 'undefined') return;

  if (user) {
    try {
      const token = await user.getIdToken(options?.forceRefresh ?? false);
      const rememberMe = options?.rememberMe ?? readRememberMePreference();
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, rememberMe }),
      });
      if (!res.ok) {
        console.error('Failed to set auth cookie:', res.status);
        await clearAuthCookie();
      }
    } catch (error) {
      console.error('Failed to set auth cookie:', error);
      await clearAuthCookie();
    }
  } else {
    await clearAuthCookie();
  }
};

interface TrustedDeviceState extends TrustedDevice {
  isCurrentDevice: boolean;
}

function toDeviceState(devices: TrustedDevice[], currentDeviceId: string): TrustedDeviceState[] {
  return devices.map((device) => ({
    ...device,
    isCurrentDevice: device.deviceId === currentDeviceId,
  }));
}

interface AuthState {
  // State
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  rememberMe: boolean;

  // Device trust
  deviceTrustChecked: boolean;
  deviceTrusted: boolean;
  deviceTrustLoading: boolean;
  trustedDevices: TrustedDeviceState[];

  // Actions
  initialize: () => void;
  signInWithEmail: (
    email: string,
    password: string,
    options?: { rememberMe?: boolean }
  ) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: (options?: { rememberMe?: boolean }) => Promise<void>;
  sendEmailSignInLink: (email: string, redirectPath?: string) => Promise<void>;
  setRememberMe: (rememberMe: boolean) => void;
  checkDeviceTrust: () => Promise<boolean>;
  trustCurrentDevice: () => Promise<void>;
  loadTrustedDevices: () => Promise<void>;
  revokeTrustedDevice: (deviceId: string) => Promise<void>;
  startPhoneVerification: (phoneNumber: string, recaptchaContainerId: string) => Promise<void>;
  verifyPhoneCode: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
  refreshProfile: () => Promise<void>;
  refreshSession: (options?: { forceRefresh?: boolean }) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  // Initial state
  user: null,
  profile: null,
  loading: false,
  error: null,
  initialized: false,
  rememberMe: DEFAULT_REMEMBER_ME,
  deviceTrustChecked: false,
  deviceTrusted: true,
  deviceTrustLoading: false,
  trustedDevices: [],

  // Initialize auth listener
  initialize: () => {
    if (get().initialized) return;

    const rememberMe = readRememberMePreference();
    set({ rememberMe });

    // Check if Firebase is configured before initializing
    if (!isFirebaseConfigured()) {
      console.warn('Firebase is not configured. Auth will not be initialized.');
      // Clear any stale auth cookie to prevent redirect loops
      clearAuthCookie();
      set({ initialized: true, loading: false, deviceTrustChecked: true, deviceTrusted: true });
      return;
    }

    try {
      authService.onAuthStateChange(async (user) => {
        set({
          user,
          error: user ? null : get().error,
          loading: true,
          deviceTrustChecked: !user,
          deviceTrustLoading: Boolean(user),
          deviceTrusted: !user,
        });

        const resolvedRememberMe = pendingRememberMePreference ?? get().rememberMe;

        // Set or remove auth cookie for middleware
        await setAuthCookie(user, { rememberMe: resolvedRememberMe });
        pendingRememberMePreference = null;

        if (user) {
          try {
            const profilePromise = (async () => {
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
              return profile;
            })();

            const trustPromise = (async () => {
              // Device verification is enforced only for verified email accounts.
              if (!user.email || !user.emailVerified) {
                return {
                  trusted: true,
                  currentDeviceId: deviceSecurityService.getOrCreateCurrentDeviceId(),
                  trustedDevices: [] as TrustedDevice[],
                };
              }

              return deviceSecurityService.evaluateCurrentDeviceTrust(user.uid);
            })();

            const [profile, trustResult] = await Promise.all([profilePromise, trustPromise]);
            set({
              profile,
              loading: false,
              initialized: true,
              deviceTrustChecked: true,
              deviceTrustLoading: false,
              deviceTrusted: trustResult.trusted,
              trustedDevices: toDeviceState(
                trustResult.trustedDevices,
                trustResult.currentDeviceId
              ),
            });
          } catch (error) {
            console.error('Failed to initialize user session:', error);
            // Fail-open to avoid locking users out when trust metadata cannot be loaded.
            set({
              loading: false,
              initialized: true,
              deviceTrustChecked: true,
              deviceTrustLoading: false,
              deviceTrusted: true,
            });
          }
        } else {
          set({
            profile: null,
            loading: false,
            initialized: true,
            deviceTrustChecked: true,
            deviceTrustLoading: false,
            deviceTrusted: true,
            trustedDevices: [],
          });
        }
      });

      authService.onIdTokenChange(async (user) => {
        await setAuthCookie(user, { rememberMe: get().rememberMe });
      });
    } catch (error) {
      console.error('Failed to initialize auth listener:', error);
      set({ initialized: true, loading: false, deviceTrustChecked: true, deviceTrusted: true });
    }
  },

  // Sign in with email
  signInWithEmail: async (email, password, options) => {
    const rememberMe = options?.rememberMe ?? get().rememberMe;
    pendingRememberMePreference = rememberMe;
    writeRememberMePreference(rememberMe);

    set({ loading: true, error: null, rememberMe });
    try {
      await authService.signInWithEmail(email, password);
      // Note: onAuthStateChange will set the user and profile
      // We set loading: false here to ensure UI doesn't hang
      set({ loading: false });
    } catch (error) {
      pendingRememberMePreference = null;
      const message = getAuthErrorMessage(error, 'Sign in failed');
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

      // Send verification email immediately after account creation.
      try {
        await authService.sendEmailVerification();
      } catch (verificationError) {
        console.error('Failed to send verification email after sign up:', verificationError);
      }

      set({ profile, loading: false });
    } catch (error) {
      const message = getAuthErrorMessage(error, 'Sign up failed');
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Sign in with Google
  signInWithGoogle: async (options) => {
    const rememberMe = options?.rememberMe ?? get().rememberMe;
    pendingRememberMePreference = rememberMe;
    writeRememberMePreference(rememberMe);

    set({ loading: true, error: null, rememberMe });
    try {
      await authService.signInWithGoogle();
      set({ loading: false });
    } catch (error) {
      pendingRememberMePreference = null;
      const message = getAuthErrorMessage(error, 'Google sign in failed');
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Send passwordless email link sign-in
  sendEmailSignInLink: async (email, redirectPath) => {
    set({ loading: true, error: null });
    try {
      await authService.sendEmailSignInLink(email, { redirectPath });
      set({ loading: false });
    } catch (error) {
      const message = getAuthErrorMessage(error, 'Email link sign in failed');
      set({ error: message, loading: false });
      throw error;
    }
  },

  setRememberMe: (rememberMe) => {
    writeRememberMePreference(rememberMe);
    set({ rememberMe });
  },

  checkDeviceTrust: async () => {
    const { user } = get();
    if (!user) {
      set({
        deviceTrustChecked: true,
        deviceTrusted: true,
        deviceTrustLoading: false,
        trustedDevices: [],
      });
      return true;
    }

    if (!user.email || !user.emailVerified) {
      set({ deviceTrustChecked: true, deviceTrusted: true, deviceTrustLoading: false });
      return true;
    }

    set({ deviceTrustLoading: true, error: null });
    try {
      const trustResult = await deviceSecurityService.evaluateCurrentDeviceTrust(user.uid);
      set({
        deviceTrustChecked: true,
        deviceTrustLoading: false,
        deviceTrusted: trustResult.trusted,
        trustedDevices: toDeviceState(trustResult.trustedDevices, trustResult.currentDeviceId),
      });
      return trustResult.trusted;
    } catch (error) {
      console.error('Failed to check device trust:', error);
      set({
        deviceTrustChecked: true,
        deviceTrustLoading: false,
        deviceTrusted: true,
      });
      return true;
    }
  },

  trustCurrentDevice: async () => {
    const { user } = get();
    if (!user) {
      throw new Error('No authenticated user');
    }

    set({ deviceTrustLoading: true, error: null });
    try {
      const trustResult = await deviceSecurityService.trustCurrentDevice(user.uid);
      set({
        deviceTrustChecked: true,
        deviceTrustLoading: false,
        deviceTrusted: true,
        trustedDevices: toDeviceState(trustResult.trustedDevices, trustResult.currentDeviceId),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to trust this device';
      set({ error: message, deviceTrustLoading: false });
      throw error;
    }
  },

  loadTrustedDevices: async () => {
    const { user } = get();
    if (!user) {
      set({ trustedDevices: [] });
      return;
    }

    set({ deviceTrustLoading: true, error: null });
    try {
      const trustedDevices = await deviceSecurityService.getTrustedDevices(user.uid);
      const currentDeviceId = deviceSecurityService.getOrCreateCurrentDeviceId();
      set({
        trustedDevices: toDeviceState(trustedDevices, currentDeviceId),
        deviceTrustLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load trusted devices';
      set({ error: message, deviceTrustLoading: false });
      throw error;
    }
  },

  revokeTrustedDevice: async (deviceId) => {
    const { user } = get();
    if (!user) {
      throw new Error('No authenticated user');
    }

    set({ deviceTrustLoading: true, error: null });
    try {
      const trustedDevices = await deviceSecurityService.revokeTrustedDevice(user.uid, deviceId);
      const currentDeviceId = deviceSecurityService.getOrCreateCurrentDeviceId();
      const currentDeviceTrusted = trustedDevices.some(
        (device) => device.deviceId === currentDeviceId
      );

      set({
        trustedDevices: toDeviceState(trustedDevices, currentDeviceId),
        deviceTrusted: currentDeviceTrusted || !user.email || !user.emailVerified,
        deviceTrustChecked: true,
        deviceTrustLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke trusted device';
      set({ error: message, deviceTrustLoading: false });
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
      const message = getAuthErrorMessage(error, 'Phone verification failed');
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Verify phone code
  verifyPhoneCode: async (code) => {
    pendingRememberMePreference = get().rememberMe;

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

      set({
        profile,
        loading: false,
        deviceTrustChecked: true,
        deviceTrusted: true,
        deviceTrustLoading: false,
      });
    } catch (error) {
      pendingRememberMePreference = null;
      const message = getAuthErrorMessage(error, 'Code verification failed');
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
        // Best-effort presence update — it must NEVER block sign-out. An
        // unverified user (or one whose Firestore write is rejected/offline)
        // must still be able to sign out, so swallow any failure here instead
        // of letting it abort the actual Firebase sign-out + cookie clear below.
        try {
          await userService.setUserOffline(user.uid);
        } catch (presenceError) {
          console.error('setUserOffline during sign-out (ignored):', presenceError);
        }
      }
      await authService.signOut();
      // Ensure cookie is removed
      await setAuthCookie(null);
      set({
        user: null,
        profile: null,
        loading: false,
        deviceTrustChecked: true,
        deviceTrusted: true,
        deviceTrustLoading: false,
        trustedDevices: [],
      });
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
      const message = getAuthErrorMessage(error, 'Password reset failed');
      set({ error: message, loading: false });
      throw error;
    }
  },

  // Refresh profile
  setProfile: (profile) => set({ profile }),

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

  // Refresh session cookie with current Firebase ID token
  refreshSession: async (options) => {
    const { user, rememberMe } = get();
    await setAuthCookie(user, { ...options, rememberMe });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
