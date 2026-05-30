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

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

class AuthService {
  private confirmationResult: ConfirmationResult | null = null;

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

    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  /**
   * Send passwordless email sign-in link
   */
  async sendEmailSignInLink(
    email: string,
    options?: { redirectPath?: string }
  ): Promise<void> {
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
  async startPhoneVerification(
    phoneNumber: string,
    recaptchaContainerId: string
  ): Promise<void> {
    const auth = getFirebaseAuth();

    const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'invisible',
    });

    this.confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );
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
    await firebaseSendEmailVerification(user);
  }

  /**
   * Reload current user and return latest email verification status.
   */
  async checkEmailVerification(): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Phone-only users do not require email verification.
    if (!user.email) {
      return true;
    }

    await user.reload();
    const refreshedUser = this.getCurrentUser();
    return Boolean(refreshedUser?.emailVerified);
  }
}

export const authService = new AuthService();
