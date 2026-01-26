import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  User,
  ConfirmationResult,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { getFirebaseAuth } from '../firebase/config';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

class AuthService {
  private confirmationResult: ConfirmationResult | null = null;

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
    await signOut(auth);
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
   * Get ID token for API calls
   */
  async getIdToken(): Promise<string | null> {
    const user = this.getCurrentUser();
    if (!user) return null;
    return user.getIdToken();
  }
}

export const authService = new AuthService();
