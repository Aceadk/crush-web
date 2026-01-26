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
import { UserProfile, UserSettings, DEFAULT_USER_SETTINGS } from '../types/user';

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
      interestedIn: data.interestedIn as UserProfile['interestedIn'],
      photos: (data.photos as string[]) || [],
      profilePhotoUrl: data.profilePhotoUrl as string | undefined,
      location: data.location as UserProfile['location'],
      interests: data.interests as string[] | undefined,
      prompts: data.prompts as UserProfile['prompts'],
      isVerified: data.isVerified as boolean || false,
      isPremium: data.isPremium as boolean || false,
      createdAt: this.timestampToString(data.createdAt),
      updatedAt: this.timestampToString(data.updatedAt),
      lastActive: this.timestampToString(data.lastActive),
      isOnline: data.isOnline as boolean | undefined,
      settings: data.settings as UserSettings | undefined,
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
