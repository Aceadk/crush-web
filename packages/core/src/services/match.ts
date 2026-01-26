import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import { Match, MatchStatus, SwipeAction, DiscoveryProfile, DiscoveryFilters } from '../types/match';

const MATCHES_COLLECTION = 'matches';
const SWIPES_COLLECTION = 'swipes';
const USERS_COLLECTION = 'users';

class MatchService {
  /**
   * Get all matches for a user
   */
  async getMatches(userId: string, status?: MatchStatus): Promise<Match[]> {
    const db = getFirebaseDb();

    let q = query(
      collection(db, MATCHES_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    if (status) {
      q = query(
        collection(db, MATCHES_COLLECTION),
        where('userId', '==', userId),
        where('status', '==', status),
        orderBy('updatedAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapDocToMatch(doc.id, doc.data()));
  }

  /**
   * Subscribe to matches updates
   */
  subscribeToMatches(
    userId: string,
    callback: (matches: Match[]) => void
  ): Unsubscribe {
    const db = getFirebaseDb();

    const q = query(
      collection(db, MATCHES_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'mutual'),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const matches = snapshot.docs.map((doc) =>
        this.mapDocToMatch(doc.id, doc.data())
      );
      callback(matches);
    });
  }

  /**
   * Record a swipe action
   */
  async swipe(
    swiperId: string,
    swipedUserId: string,
    action: 'like' | 'pass' | 'superlike'
  ): Promise<{ isMatch: boolean; matchId?: string }> {
    const db = getFirebaseDb();

    // Record the swipe
    const swipeId = `${swiperId}_${swipedUserId}`;
    await setDoc(doc(db, SWIPES_COLLECTION, swipeId), {
      swiperId,
      swipedUserId,
      action,
      timestamp: serverTimestamp(),
    });

    // If it's a pass, no match check needed
    if (action === 'pass') {
      return { isMatch: false };
    }

    // Check if the other user has already liked us
    const reverseSwipeId = `${swipedUserId}_${swiperId}`;
    const reverseSwipe = await getDoc(doc(db, SWIPES_COLLECTION, reverseSwipeId));

    if (reverseSwipe.exists()) {
      const reverseAction = reverseSwipe.data().action as string;
      if (reverseAction === 'like' || reverseAction === 'superlike') {
        // It's a match!
        const matchId = await this.createMatch(swiperId, swipedUserId, action === 'superlike');
        return { isMatch: true, matchId };
      }
    }

    return { isMatch: false };
  }

  /**
   * Create a mutual match
   */
  private async createMatch(
    userId: string,
    otherUserId: string,
    isSuperLike: boolean
  ): Promise<string> {
    const db = getFirebaseDb();
    const matchId = `${userId}_${otherUserId}`;
    const reverseMatchId = `${otherUserId}_${userId}`;

    // Get other user's info
    const otherUserDoc = await getDoc(doc(db, USERS_COLLECTION, otherUserId));
    const otherUserData = otherUserDoc.data();

    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    const userData = userDoc.data();

    const now = serverTimestamp();

    // Create match for user
    await setDoc(doc(db, MATCHES_COLLECTION, matchId), {
      userId,
      otherUserId,
      status: 'mutual',
      preMatchMessageRequestsCount: 0,
      pinnedForUser: false,
      otherUserName: otherUserData?.displayName || '',
      otherUserPhotoUrl: otherUserData?.photos?.[0] || '',
      createdAt: now,
      updatedAt: now,
      unreadCount: 0,
      isSuperLike,
    });

    // Create match for other user
    await setDoc(doc(db, MATCHES_COLLECTION, reverseMatchId), {
      userId: otherUserId,
      otherUserId: userId,
      status: 'mutual',
      preMatchMessageRequestsCount: 0,
      pinnedForUser: false,
      otherUserName: userData?.displayName || '',
      otherUserPhotoUrl: userData?.photos?.[0] || '',
      createdAt: now,
      updatedAt: now,
      unreadCount: 0,
      isSuperLike,
    });

    return matchId;
  }

  /**
   * Get discovery profiles (potential matches)
   */
  async getDiscoveryProfiles(
    userId: string,
    filters: DiscoveryFilters,
    pageSize: number = 20
  ): Promise<DiscoveryProfile[]> {
    const db = getFirebaseDb();

    // Get users already swiped
    const swipesQuery = query(
      collection(db, SWIPES_COLLECTION),
      where('swiperId', '==', userId)
    );
    const swipesSnapshot = await getDocs(swipesQuery);
    const swipedUserIds = new Set(
      swipesSnapshot.docs.map((doc) => doc.data().swipedUserId as string)
    );
    swipedUserIds.add(userId); // Exclude self

    // Query users
    let usersQuery = query(
      collection(db, USERS_COLLECTION),
      where('onboardingComplete', '==', true),
      where('profileComplete', '==', true),
      limit(pageSize * 2) // Get extra to filter
    );

    const usersSnapshot = await getDocs(usersQuery);

    const profiles: DiscoveryProfile[] = [];

    for (const userDoc of usersSnapshot.docs) {
      if (swipedUserIds.has(userDoc.id)) continue;

      const data = userDoc.data();
      const age = data.age as number | undefined;

      // Apply age filter
      if (age && (age < filters.minAge || age > filters.maxAge)) continue;

      // Apply gender filter
      if (filters.genders && filters.genders.length > 0) {
        if (!filters.genders.includes(data.gender as string)) continue;
      }

      profiles.push({
        id: userDoc.id,
        displayName: data.displayName as string || '',
        age,
        bio: data.bio as string | undefined,
        photos: (data.photos as string[]) || [],
        interests: data.interests as string[] | undefined,
        prompts: data.prompts as DiscoveryProfile['prompts'],
        isVerified: data.isVerified as boolean || false,
        lastActive: this.timestampToString(data.lastActive),
      });

      if (profiles.length >= pageSize) break;
    }

    return profiles;
  }

  /**
   * Unmatch with a user
   */
  async unmatch(userId: string, matchId: string): Promise<void> {
    const db = getFirebaseDb();

    const matchDoc = await getDoc(doc(db, MATCHES_COLLECTION, matchId));
    if (!matchDoc.exists()) {
      throw new Error('Match not found');
    }

    const matchData = matchDoc.data();
    const otherUserId = matchData.otherUserId as string;
    const reverseMatchId = `${otherUserId}_${userId}`;

    // Update both match documents
    await updateDoc(doc(db, MATCHES_COLLECTION, matchId), {
      status: 'unmatched',
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, MATCHES_COLLECTION, reverseMatchId), {
      status: 'unmatched',
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Pin/unpin a match
   */
  async togglePinMatch(matchId: string, pinned: boolean): Promise<void> {
    const db = getFirebaseDb();

    await updateDoc(doc(db, MATCHES_COLLECTION, matchId), {
      pinnedForUser: pinned,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Map Firestore document to Match
   */
  private mapDocToMatch(id: string, data: Record<string, unknown>): Match {
    return {
      id,
      userId: data.userId as string,
      otherUserId: data.otherUserId as string,
      status: data.status as MatchStatus,
      preMatchMessageRequestsCount: data.preMatchMessageRequestsCount as number || 0,
      pinnedForUser: data.pinnedForUser as boolean || false,
      otherUserName: data.otherUserName as string | undefined,
      otherUserPhotoUrl: data.otherUserPhotoUrl as string | undefined,
      createdAt: this.timestampToString(data.createdAt),
      updatedAt: this.timestampToString(data.updatedAt),
      lastMessageAt: this.timestampToString(data.lastMessageAt),
      lastMessage: data.lastMessage as string | undefined,
      unreadCount: data.unreadCount as number || 0,
      isSuperLike: data.isSuperLike as boolean | undefined,
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

export const matchService = new MatchService();
