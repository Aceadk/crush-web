import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import { callables } from '../api/callables';
import { DEFAULT_USER_SETTINGS, UserProfile, UserSettings } from '../types/user';
import {
  buildUserProfileCreateData,
  buildUserProfileUpdateData,
  mapUserDocumentToUserProfile,
} from './user_document';

const USERS_COLLECTION = 'users';

class UserService {
  /**
   * Get a user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));

    if (!userDoc.exists()) {
      return null;
    }

    return this.mapDocToUserProfile(userDoc.id, userDoc.data());
  }

  /**
   * Create a new user profile
   */
  async createUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const db = getFirebaseDb();
    const now = new Date().toISOString();
    const profile = buildUserProfileCreateData(
      {
        id: userId,
        displayName: data.displayName || '',
        photos: data.photos || [],
        isVerified: false,
        subscriptionTier: 'free',
        createdAt: now,
        updatedAt: now,
        hasAcceptedTerms: false,
        onboardingComplete: false,
        profileComplete: false,
        isEmailVerified: false,
        isPhoneVerified: Boolean(data.phoneNumber),
        settings: DEFAULT_USER_SETTINGS,
        ...data,
      },
      now
    );

    await setDoc(doc(db, USERS_COLLECTION, userId), {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return mapUserDocumentToUserProfile(userId, profile);
  }

  /**
   * Update a user profile
   */
  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    const db = getFirebaseDb();

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      ...buildUserProfileUpdateData(data),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Update user settings
   */
  async updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const docData = userDoc.data();
    const currentSettings = docData.settings || DEFAULT_USER_SETTINGS;

    // The canonical profile.preferences.* values are the cross-platform source
    // of truth (mobile writes ONLY those, never the legacy top-level settings
    // doc field). Merge them into the base before applying this patch —
    // otherwise toggling any single web setting would rebuild all preference
    // keys from the stale top-level settings and clobber values the user set
    // on mobile (e.g. their age range).
    const profilePreferences =
      (docData.profile as { preferences?: Record<string, unknown> } | undefined)?.preferences ??
      {};
    const canonicalAsSettings: Partial<UserSettings> = {};
    if (typeof profilePreferences.maxDistanceKm === 'number') {
      canonicalAsSettings.maxDistance = profilePreferences.maxDistanceKm;
    }
    if (typeof profilePreferences.minAge === 'number') {
      canonicalAsSettings.ageRangeMin = profilePreferences.minAge;
    }
    if (typeof profilePreferences.maxAge === 'number') {
      canonicalAsSettings.ageRangeMax = profilePreferences.maxAge;
    }
    if (typeof profilePreferences.showMyDistance === 'boolean') {
      canonicalAsSettings.showDistance = profilePreferences.showMyDistance;
    }
    if (typeof profilePreferences.showMyAge === 'boolean') {
      canonicalAsSettings.showAge = profilePreferences.showMyAge;
    }
    if (typeof profilePreferences.incognitoMode === 'boolean') {
      canonicalAsSettings.incognitoMode = profilePreferences.incognitoMode;
    }
    if (typeof profilePreferences.hideFromDiscovery === 'boolean') {
      canonicalAsSettings.showInDiscovery = !profilePreferences.hideFromDiscovery;
    }

    const mergedSettings = { ...currentSettings, ...canonicalAsSettings, ...settings };

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      settings: mergedSettings,
      ...buildUserProfileUpdateData({ settings: mergedSettings }),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    userId: string,
    notificationSettings: Record<string, boolean | number | string[]>
  ): Promise<void> {
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const currentNotificationPrefs = userDoc.data().notificationPrefs || {};

    await setDoc(
      doc(db, USERS_COLLECTION, userId),
      {
        notificationPrefs: { ...currentNotificationPrefs, ...notificationSettings },
        notificationPrefsUpdatedAt: serverTimestamp(),
        notificationPrefsUpdatedAtMs: Date.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * Update user's last active timestamp
   */
  async updateLastActive(userId: string): Promise<void> {
    const db = getFirebaseDb();

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      lastActive: serverTimestamp(),
      isOnline: true,
    });
  }

  /**
   * Set user offline
   */
  async setUserOffline(userId: string): Promise<void> {
    const db = getFirebaseDb();

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      isOnline: false,
      lastActive: serverTimestamp(),
    });
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const db = getFirebaseDb();
    const q = query(
      collection(db, USERS_COLLECTION),
      where('username', '==', username.toLowerCase())
    );

    const snapshot = await getDocs(q);
    return snapshot.empty;
  }

  /**
   * Accept terms and conditions
   */
  async acceptTermsAndConditions(userId: string): Promise<void> {
    const db = getFirebaseDb();
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      hasAcceptedTerms: true,
      termsAcceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Mark onboarding as complete
   */
  async completeOnboarding(userId: string): Promise<void> {
    await this.updateUserProfile(userId, { onboardingComplete: true });
  }

  /**
   * Request account deletion (14-day grace period via Cloud Function).
   * The Cloud Function handles cascading deletion of all user data
   * across Firestore, RTDB, Storage, and Auth after the grace period.
   */
  async deleteAccount(
    userId: string,
    reason?: string
  ): Promise<{
    scheduledAt: string;
    gracePeriodDays: number;
    message: string;
  }> {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const requestDeletion = httpsCallable<
      { reason?: string },
      { success: boolean; scheduledAt: string; gracePeriodDays: number; message: string }
    >(functions, 'requestAccountDeletion');

    const result = await requestDeletion({
      reason: reason || 'User requested deletion from web app',
    });
    return result.data;
  }

  /**
   * Cancel a pending account deletion (within 14-day grace period).
   */
  async cancelAccountDeletion(): Promise<{ message: string }> {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const cancelDeletion = httpsCallable<
      Record<string, never>,
      { success: boolean; message: string }
    >(functions, 'cancelAccountDeletion');

    const result = await cancelDeletion({});
    return result.data;
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(
    _userId?: string
  ): Promise<{ id: string; name: string; photoUrl?: string; blockedAt: Date }[]> {
    // Canonical `blocks` docs (and blocked users' profiles) are not
    // client-readable; the backend getBlockedUsers callable returns the enriched
    // list. _userId is ignored (derived from auth) and kept for call-site compat.
    const result = await callables.getBlockedUsers();
    return (result.blocked ?? []).map((b) => ({
      id: b.id,
      name: b.name || 'Unknown User',
      photoUrl: b.photoUrl ?? undefined,
      blockedAt: b.blockedAt ? new Date(b.blockedAt) : new Date(),
    }));
  }

  /**
   * Block a user via the backend blockUser callable (writes the canonical
   * blocks/{blockerId_blockedId} doc and handles match cleanup server-side).
   */
  async blockUser(_userId: string, blockedUserId: string): Promise<void> {
    await callables.blockUser({ blockedId: blockedUserId });
  }

  /**
   * Check if a user is blocked (by the caller). Uses the backend list since the
   * blocks collection is not client-readable.
   */
  async isUserBlocked(_userId: string, otherUserId: string): Promise<boolean> {
    const blocked = await this.getBlockedUsers();
    return blocked.some((b) => b.id === otherUserId);
  }

  /**
   * Unblock a user via the backend unblockUser callable.
   */
  async unblockUser(_userId: string, blockedUserId: string): Promise<void> {
    await callables.unblockUser({ blockedId: blockedUserId });
  }

  /**
   * Report a user via the backend reportUser callable (canonical reports shape).
   */
  async reportUser(
    _reporterId: string,
    reportedUserId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    await callables.reportUser({
      reportedId: reportedUserId,
      reason,
      description: details,
      source: 'web',
    });
  }

  /**
   * Block and report a user
   */
  async blockAndReportUser(
    userId: string,
    blockedUserId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    await Promise.all([
      this.blockUser(userId, blockedUserId),
      this.reportUser(userId, blockedUserId, reason, details),
    ]);
  }

  /**
   * Export all user data (GDPR compliance)
   */
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const db = getFirebaseDb();

    // Get user profile
    const profile = await this.getUserProfile(userId);

    // Get matches
    const matchesQuery = query(collection(db, 'matches'), where('userId', '==', userId));
    const matchesSnapshot = await getDocs(matchesQuery);
    const matches = matchesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get conversations
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );
    const conversationsSnapshot = await getDocs(conversationsQuery);
    const conversations = conversationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get blocked users
    const blockedUsers = await this.getBlockedUsers(userId);

    return {
      exportedAt: new Date().toISOString(),
      profile,
      matches,
      conversations,
      blockedUsers,
    };
  }

  /**
   * Calculate profile completeness
   */
  calculateProfileCompleteness(profile: UserProfile): number {
    let score = 0;
    const maxScore = 100;

    if (profile.displayName) score += 15;
    if (profile.bio && profile.bio.length > 20) score += 15;
    if (profile.photos.length >= 1) score += 20;
    if (profile.photos.length >= 3) score += 10;
    if (profile.birthDate) score += 10;
    if (profile.interests && profile.interests.length >= 3) score += 15;
    if (profile.prompts && profile.prompts.length >= 1) score += 15;

    return Math.min(score, maxScore);
  }

  /**
   * Map Firestore document to UserProfile
   */
  private mapDocToUserProfile(id: string, data: Record<string, unknown>): UserProfile {
    return mapUserDocumentToUserProfile(id, data);
  }

  private timestampToString(timestamp: unknown): string {
    if (!timestamp) return new Date().toISOString();
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    if (typeof timestamp === 'string') return timestamp;
    if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
      return new Date(timestamp).toISOString();
    }
    return new Date().toISOString();
  }

  private timestampToOptionalString(timestamp: unknown): string | undefined {
    if (!timestamp) return undefined;
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    if (typeof timestamp === 'string') {
      const parsed = Date.parse(timestamp);
      return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
    }
    if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
      return new Date(timestamp).toISOString();
    }
    if (
      typeof timestamp === 'object' &&
      timestamp !== null &&
      'toDate' in timestamp &&
      typeof (timestamp as { toDate?: unknown }).toDate === 'function'
    ) {
      const asDate = (timestamp as { toDate: () => Date }).toDate();
      if (Number.isNaN(asDate.getTime())) return undefined;
      return asDate.toISOString();
    }
    return undefined;
  }
}

export const userService = new UserService();
