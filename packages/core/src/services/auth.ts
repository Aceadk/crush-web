import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  User,
  ConfirmationResult,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  sendEmailVerification as firebaseSendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { getFirebaseAuth } from '../firebase/config';
import { callables } from '../api/callables';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const VERIFICATION_EMAIL_DELIVERY_KEY_PREFIX = 'crush:verification-email-delivery:';

function verificationEmailDeliveryKey(uid: string): string {
  return `${VERIFICATION_EMAIL_DELIVERY_KEY_PREFIX}${uid}`;
}

function getAuthenticatedGoogleUser(user: User | null): User | null {
  const signedInWithGoogle = user?.providerData.some(
    ({ providerId }) => providerId === GoogleAuthProvider.PROVIDER_ID
  );
  return signedInWithGoogle ? user : null;
}

export function reconcileGooglePopupError(error: unknown, currentUser: User | null): User {
  const authenticatedUser = getAuthenticatedGoogleUser(currentUser);
  if (authenticatedUser) {
    return authenticatedUser;
  }
  throw error;
}

class AuthService {
  private confirmationResult: ConfirmationResult | null = null;
  private verificationEmailSendInFlight = new Map<string, Promise<void>>();

  private sanitizeRedirectPath(redirectPath?: string): string {
    if (!redirectPath) {
      return '/discover';
    }

    const trimmed = redirectPath.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
      return '/discover';
    }

    return trimmed;
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<User> {
    const auth = getFirebaseAuth();
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  /**
   * Create a new account with email and password
   */
  async signUpWithEmail(email: string, password: string, displayName?: string): Promise<User> {
    const auth = getFirebaseAuth();
    const result = await createUserWithEmailAndPassword(auth, email, password);

    if (displayName) {
      await updateProfile(result.user, { displayName });
    }

    return result.user;
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<User> {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      // Browsers can report a popup close/cancel after Firebase has already
      // committed the authenticated user. In that case, auth state is the
      // authoritative result and the UI must not surface a false failure.
      return reconcileGooglePopupError(error, auth.currentUser);
    }
  }

  /**
   * Send passwordless email sign-in link
   */
  async sendEmailSignInLink(email: string, options?: { redirectPath?: string }): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Email link sign-in is only supported in the browser');
    }

    const auth = getFirebaseAuth();
    const redirectPath = this.sanitizeRedirectPath(options?.redirectPath);
    const finishSignInUrl = new URL('/finishSignIn', window.location.origin);
    finishSignInUrl.searchParams.set('redirect', redirectPath);

    await sendSignInLinkToEmail(auth, email, {
      url: finishSignInUrl.toString(),
      handleCodeInApp: true,
    });

    window.localStorage.setItem('emailForSignIn', email);
  }

  /**
   * Check whether the current URL is an email sign-in link
   */
  isEmailSignInLink(emailLink: string): boolean {
    const auth = getFirebaseAuth();
    return isSignInWithEmailLink(auth, emailLink);
  }

  /**
   * Complete passwordless email sign-in with the link the user clicked
   */
  async completeEmailLinkSignIn(email: string, emailLink: string): Promise<User> {
    const auth = getFirebaseAuth();
    const result = await signInWithEmailLink(auth, email, emailLink);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('emailForSignIn');
    }

    return result.user;
  }

  /**
   * Start phone number verification
   */
  async startPhoneVerification(phoneNumber: string, recaptchaContainerId: string): Promise<void> {
    const auth = getFirebaseAuth();

    const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'invisible',
    });

    this.confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  }

  /**
   * Verify phone number with OTP code
   */
  async verifyPhoneCode(code: string): Promise<User> {
    if (!this.confirmationResult) {
      throw new Error('Phone verification not started');
    }

    const result = await this.confirmationResult.confirm(code);
    this.confirmationResult = null;
    return result.user;
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string): Promise<void> {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    try {
      await signOut(auth);
    } finally {
      this.confirmationResult = null;
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('emailForSignIn');
      }
    }
  }

  /**
   * Get the current user
   */
  getCurrentUser(): User | null {
    const auth = getFirebaseAuth();
    return auth.currentUser;
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Subscribe to ID token changes.
   * This fires on sign-in/sign-out and token refresh events.
   */
  onIdTokenChange(callback: (user: User | null) => void): () => void {
    const auth = getFirebaseAuth();
    return onIdTokenChanged(auth, callback);
  }

  /**
   * Get ID token for API calls
   */
  async getIdToken(): Promise<string | null> {
    const user = this.getCurrentUser();
    if (!user) return null;
    return user.getIdToken();
  }

  /**
   * Update the user's email address
   * Requires reauthentication with current password
   */
  async updateEmail(newEmail: string, currentPassword: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user || !user.email) {
      throw new Error('No authenticated user with email');
    }

    // Reauthenticate first
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update email
    await firebaseUpdateEmail(user, newEmail);
  }

  /**
   * Update the user's password
   * Requires reauthentication with current password
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user || !user.email) {
      throw new Error('No authenticated user with email');
    }

    // Reauthenticate first
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await firebaseUpdatePassword(user, newPassword);
  }

  /**
   * Send email verification to current user
   */
  async sendEmailVerification(): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }
    const existingRequest = this.verificationEmailSendInFlight.get(user.uid);
    if (existingRequest) return existingRequest;

    const request = (async () => {
      if (typeof window === 'undefined') {
        await firebaseSendEmailVerification(user);
        return;
      }
      const continueUrl = new URL('/auth/verify-email', window.location.origin);
      continueUrl.searchParams.set('verified', '1');
      await firebaseSendEmailVerification(user, {
        url: continueUrl.toString(),
        handleCodeInApp: false,
      });
      this.recordVerificationEmailDelivery(user.uid);
    })();
    this.verificationEmailSendInFlight.set(user.uid, request);
    try {
      await request;
    } finally {
      if (this.verificationEmailSendInFlight.get(user.uid) === request) {
        this.verificationEmailSendInFlight.delete(user.uid);
      }
    }
  }

  /**
   * Record only a successfully accepted Firebase verification-email request.
   * The account-scoped timestamp prevents route mounts/reloads from sending a
   * duplicate first email while leaving the visible Resend action available.
   */
  recordVerificationEmailDelivery(uid: string, sentAtMs = Date.now()): void {
    if (typeof window === 'undefined' || !uid) return;
    try {
      window.localStorage.setItem(verificationEmailDeliveryKey(uid), String(sentAtMs));
    } catch {
      // Storage can be unavailable in private/restricted browser contexts. The
      // verification page still coalesces its own mounted send in memory.
    }
  }

  clearVerificationEmailDelivery(uid: string): void {
    if (typeof window === 'undefined' || !uid) return;
    try {
      window.localStorage.removeItem(verificationEmailDeliveryKey(uid));
    } catch {
      // Best-effort browser coordination only.
    }
  }

  hasRecentVerificationEmailDelivery(
    uid: string,
    maxAgeSeconds: number,
    nowMs = Date.now()
  ): boolean {
    if (typeof window === 'undefined' || !uid || maxAgeSeconds <= 0) return false;
    try {
      const rawSentAt = window.localStorage.getItem(verificationEmailDeliveryKey(uid));
      const sentAtMs = rawSentAt == null ? Number.NaN : Number(rawSentAt);
      if (!Number.isFinite(sentAtMs) || sentAtMs > nowMs + 5_000) return false;
      return sentAtMs <= nowMs && nowMs - sentAtMs < maxAgeSeconds * 1000;
    } catch {
      return false;
    }
  }

  getVerificationEmailCooldownSeconds(
    uid: string,
    cooldownSeconds: number,
    nowMs = Date.now()
  ): number {
    if (typeof window === 'undefined' || !uid || cooldownSeconds <= 0) return 0;
    try {
      const rawSentAt = window.localStorage.getItem(verificationEmailDeliveryKey(uid));
      const sentAtMs = rawSentAt == null ? Number.NaN : Number(rawSentAt);
      if (!Number.isFinite(sentAtMs) || sentAtMs > nowMs + 5_000) return 0;
      const remainingMs = sentAtMs + cooldownSeconds * 1000 - nowMs;
      return Math.min(cooldownSeconds, Math.max(0, Math.ceil(remainingMs / 1000)));
    } catch {
      return 0;
    }
  }

  /**
   * Reload current user and return latest email verification status.
   */
  async refreshAndCheckEmailVerification(): Promise<boolean> {
    const auth = getFirebaseAuth();
    const initialUser = auth.currentUser;
    if (!initialUser) {
      throw new Error('No authenticated user');
    }
    const expectedUid = initialUser.uid;

    await initialUser.reload();
    const refreshedUser = auth.currentUser;
    if (!refreshedUser || refreshedUser.uid !== expectedUid) return false;

    // Force a fresh token so callable middleware and Security Rules see the
    // updated email_verified claim immediately, without logout/restart.
    await refreshedUser.getIdToken(true);
    const verified = refreshedUser.email ? refreshedUser.emailVerified : true;

    if (refreshedUser.email && verified) {
      try {
        await callables.syncEmailVerification({});
      } catch (error) {
        // Firebase Auth remains authoritative. A failed convenience-mirror
        // repair must never turn a genuinely verified account false again.
        console.warn('Email verification mirror sync will be retried later:', error);
      }
    }
    return verified;
  }

  /** @deprecated Prefer refreshAndCheckEmailVerification. */
  async checkEmailVerification(): Promise<boolean> {
    return this.refreshAndCheckEmailVerification();
  }
}

export const authService = new AuthService();
