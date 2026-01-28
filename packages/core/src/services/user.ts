import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import { UserProfile, UserSettings, DEFAULT_USER_SETTINGS, SexualOrientation } from '../types/user';

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

    const profile: Partial<UserProfile> = {
      id: userId,
      displayName: data.displayName || '',
      photos: data.photos || [],
      isVerified: false,
      isPremium: false,
      createdAt: now,
      updatedAt: now,
      hasAcceptedTerms: false,
      onboardingComplete: false,
      profileComplete: false,
      settings: DEFAULT_USER_SETTINGS,
      ...data,
    };

    await setDoc(doc(db, USERS_COLLECTION, userId), {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return profile as UserProfile;
  }

  /**
   * Update a user profile
   */
  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    const db = getFirebaseDb();

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      ...data,
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

    const currentSettings = userDoc.data().settings || DEFAULT_USER_SETTINGS;

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      settings: { ...currentSettings, ...settings },
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId: string, notificationSettings: Record<string, boolean>): Promise<void> {
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const currentNotificationSettings = userDoc.data().notificationSettings || {};

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      notificationSettings: { ...currentNotificationSettings, ...notificationSettings },
      updatedAt: serverTimestamp(),
    });
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
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId: string): Promise<{ id: string; name: string; photoUrl?: string; blockedAt: Date }[]> {
    const db = getFirebaseDb();
    const blockedCollection = collection(db, USERS_COLLECTION, userId, 'blocked');
    const snapshot = await getDocs(blockedCollection);

    const blockedUsers = await Promise.all(
      snapshot.docs.map(async (blockedDoc) => {
        const blockedUserId = blockedDoc.id;
        const blockedData = blockedDoc.data();
        const userProfile = await this.getUserProfile(blockedUserId);

        return {
          id: blockedUserId,
          name: userProfile?.displayName || 'Unknown User',
          photoUrl: userProfile?.profilePhotoUrl || userProfile?.photos?.[0],
          blockedAt: blockedData.blockedAt?.toDate() || new Date(),
        };
      })
    );

    return blockedUsers;
  }

  /**
   * Block a user - adds to blocked list and removes from matches
   */
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    const db = getFirebaseDb();

    // Add to blocked list
    await setDoc(doc(db, USERS_COLLECTION, userId, 'blocked', blockedUserId), {
      blockedAt: serverTimestamp(),
    });

    // Also check if there's a match between these users and update it
    const matchesCollection = collection(db, 'matches');

    // Check for match where current user liked the blocked user
    const matchId1 = `${userId}_${blockedUserId}`;
    const matchDoc1 = await getDoc(doc(db, 'matches', matchId1));
    if (matchDoc1.exists() && matchDoc1.data().status === 'matched') {
      await updateDoc(doc(db, 'matches', matchId1), {
        status: 'blocked',
        blockedBy: userId,
        updatedAt: serverTimestamp(),
      });
    }

    // Check for reverse match
    const matchId2 = `${blockedUserId}_${userId}`;
    const matchDoc2 = await getDoc(doc(db, 'matches', matchId2));
    if (matchDoc2.exists() && matchDoc2.data().status === 'matched') {
      await updateDoc(doc(db, 'matches', matchId2), {
        status: 'blocked',
        blockedBy: userId,
        updatedAt: serverTimestamp(),
      });
    }
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(userId: string, otherUserId: string): Promise<boolean> {
    const db = getFirebaseDb();
    const blockedDoc = await getDoc(doc(db, USERS_COLLECTION, userId, 'blocked', otherUserId));
    return blockedDoc.exists();
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, USERS_COLLECTION, userId, 'blocked', blockedUserId));
  }

  /**
   * Report a user
   */
  async reportUser(
    reporterId: string,
    reportedUserId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    const db = getFirebaseDb();
    const reportsCollection = collection(db, 'reports');

    await setDoc(doc(reportsCollection), {
      reporterId,
      reportedUserId,
      reason,
      details: details || '',
      status: 'pending',
      createdAt: serverTimestamp(),
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
    const matchesQuery = query(
      collection(db, 'matches'),
      where('userId', '==', userId)
    );
    const matchesSnapshot = await getDocs(matchesQuery);
    const matches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get conversations
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );
    const conversationsSnapshot = await getDocs(conversationsQuery);
    const conversations = conversationsSnapshot.docs.map(doc => ({
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
    return {
      id,
      email: data.email as string | undefined,
      phoneNumber: data.phoneNumber as string | undefined,
      displayName: data.displayName as string || '',
      username: data.username as string | undefined,
      bio: data.bio as string | undefined,
      birthDate: data.birthDate as string | undefined,
      age: data.age as number | undefined,
      gender: data.gender as UserProfile['gender'],
      sexualOrientation: data.sexualOrientation as SexualOrientation | undefined,
      interestedIn: data.interestedIn as UserProfile['interestedIn'],
      photos: (data.photos as string[]) || [],
      profilePhotoUrl: data.profilePhotoUrl as string | undefined,
      location: data.location as UserProfile['location'],
      interests: data.interests as string[] | undefined,
      prompts: data.prompts as UserProfile['prompts'],
      isVerified: data.isVerified as boolean || false,
      isPremium: data.isPremium as boolean || false,
      premiumPlan: data.premiumPlan as UserProfile['premiumPlan'],
      premiumExpiresAt: data.premiumExpiresAt as string | undefined,
      premiumAutoRenew: data.premiumAutoRenew as boolean | undefined,
      stripeCustomerId: data.stripeCustomerId as string | undefined,
      stripeSubscriptionId: data.stripeSubscriptionId as string | undefined,
      createdAt: this.timestampToString(data.createdAt),
      updatedAt: this.timestampToString(data.updatedAt),
      lastActive: this.timestampToString(data.lastActive),
      isOnline: data.isOnline as boolean | undefined,
      settings: data.settings as UserSettings | undefined,
      notificationSettings: data.notificationSettings as UserProfile['notificationSettings'],
      hasAcceptedTerms: data.hasAcceptedTerms as boolean || false,
      termsAcceptedAt: data.termsAcceptedAt as string | undefined,
      onboardingComplete: data.onboardingComplete as boolean || false,
      profileComplete: data.profileComplete as boolean || false,
    };
  }

  private timestampToString(timestamp: unknown): string {
    if (!timestamp) return new Date().toISOString();
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    if (typeof timestamp === 'string') return timestamp;
    return new Date().toISOString();
  }
}

export const userService = new UserService();
