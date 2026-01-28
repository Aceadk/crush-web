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
import { Match, MatchStatus, SwipeAction, DiscoveryProfile, DiscoveryFilters, ReceivedLike, MessageRequest, WeeklyPick } from '../types/match';

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
   * Get users who have liked the current user (premium feature)
   */
  async getLikesReceived(userId: string): Promise<ReceivedLike[]> {
    const db = getFirebaseDb();

    // Query swipes where the current user was swiped on with like/superlike
    const swipesQuery = query(
      collection(db, SWIPES_COLLECTION),
      where('swipedUserId', '==', userId),
      where('action', 'in', ['like', 'superlike']),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const swipesSnapshot = await getDocs(swipesQuery);

    // Get users who have already matched with the current user
    const matchesQuery = query(
      collection(db, MATCHES_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'mutual')
    );
    const matchesSnapshot = await getDocs(matchesQuery);
    const matchedUserIds = new Set(
      matchesSnapshot.docs.map((doc) => doc.data().otherUserId as string)
    );

    const receivedLikes: ReceivedLike[] = [];

    for (const swipeDoc of swipesSnapshot.docs) {
      const swipeData = swipeDoc.data();
      const likerUserId = swipeData.swiperId as string;

      // Skip if already matched
      if (matchedUserIds.has(likerUserId)) continue;

      // Get liker's profile info
      const likerDoc = await getDoc(doc(db, USERS_COLLECTION, likerUserId));
      if (!likerDoc.exists()) continue;

      const likerData = likerDoc.data();

      receivedLikes.push({
        id: swipeDoc.id,
        likerUserId,
        likerName: likerData.displayName as string || 'Unknown',
        likerPhotoUrl: likerData.photos?.[0] as string || likerData.profilePhotoUrl as string,
        likerAge: likerData.age as number | undefined,
        isSuperLike: swipeData.action === 'superlike',
        timestamp: this.timestampToString(swipeData.timestamp),
      });
    }

    return receivedLikes;
  }

  /**
   * Get message requests (messages from people who liked you but you haven't matched yet)
   * This is a premium feature
   */
  async getMessageRequests(userId: string): Promise<MessageRequest[]> {
    const db = getFirebaseDb();

    // Get swipes with message requests (people who liked this user and sent a message)
    const swipesQuery = query(
      collection(db, SWIPES_COLLECTION),
      where('swipedUserId', '==', userId),
      where('action', 'in', ['like', 'superlike']),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const swipesSnapshot = await getDocs(swipesQuery);

    // Get users who have already matched with the current user
    const matchesQuery = query(
      collection(db, MATCHES_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'mutual')
    );
    const matchesSnapshot = await getDocs(matchesQuery);
    const matchedUserIds = new Set(
      matchesSnapshot.docs.map((doc) => doc.data().otherUserId as string)
    );

    const messageRequests: MessageRequest[] = [];

    for (const swipeDoc of swipesSnapshot.docs) {
      const swipeData = swipeDoc.data();
      const fromUserId = swipeData.swiperId as string;
      const message = swipeData.message as string | undefined;

      // Skip if already matched or no message
      if (matchedUserIds.has(fromUserId) || !message) continue;

      // Get sender's profile info
      const senderDoc = await getDoc(doc(db, USERS_COLLECTION, fromUserId));
      if (!senderDoc.exists()) continue;

      const senderData = senderDoc.data();

      messageRequests.push({
        id: swipeDoc.id,
        fromUserId,
        fromUserName: senderData.displayName as string || 'Unknown',
        fromUserPhotoUrl: senderData.photos?.[0] as string || senderData.profilePhotoUrl as string,
        fromUserAge: senderData.age as number | undefined,
        message,
        isSuperLike: swipeData.action === 'superlike',
        timestamp: this.timestampToString(swipeData.timestamp),
      });
    }

    return messageRequests;
  }

  /**
   * Accept a message request (like the user back, creating a match)
   */
  async acceptMessageRequest(userId: string, fromUserId: string): Promise<{ matchId: string }> {
    // Simply swipe like - if they already liked us, it will create a match
    const result = await this.swipe(userId, fromUserId, 'like');
    if (!result.isMatch || !result.matchId) {
      throw new Error('Failed to create match');
    }
    return { matchId: result.matchId };
  }

  /**
   * Decline a message request (pass on the user)
   */
  async declineMessageRequest(userId: string, fromUserId: string): Promise<void> {
    await this.swipe(userId, fromUserId, 'pass');
  }

  /**
   * Get weekly picks - curated profiles for the user
   * These are high-quality matches selected based on compatibility
   */
  async getWeeklyPicks(userId: string): Promise<WeeklyPick[]> {
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

    // Get current user's profile for matching interests
    const currentUserDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    const currentUserData = currentUserDoc.data();
    const currentUserInterests = (currentUserData?.interests as string[]) || [];

    // Query active users with complete profiles
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where('onboardingComplete', '==', true),
      where('profileComplete', '==', true),
      limit(100) // Get more to filter and rank
    );

    const usersSnapshot = await getDocs(usersQuery);

    const picks: WeeklyPick[] = [];
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay())); // End of week
    weekEnd.setHours(23, 59, 59, 999);

    for (const userDoc of usersSnapshot.docs) {
      if (swipedUserIds.has(userDoc.id)) continue;

      const data = userDoc.data();
      const userInterests = (data.interests as string[]) || [];

      // Calculate compatibility score based on shared interests
      const sharedInterests = currentUserInterests.filter(
        (interest) => userInterests.includes(interest)
      );
      const compatibilityScore = currentUserInterests.length > 0
        ? Math.round((sharedInterests.length / Math.max(currentUserInterests.length, 1)) * 100)
        : 50;

      // Determine pick reason
      let pickReason = 'Featured profile';
      if (sharedInterests.length >= 3) {
        pickReason = `${sharedInterests.length} shared interests`;
      } else if (data.isVerified) {
        pickReason = 'Verified profile';
      } else if (data.photos?.length >= 3) {
        pickReason = 'Active user';
      }

      picks.push({
        id: `pick_${userDoc.id}`,
        userId: userDoc.id,
        displayName: data.displayName as string || '',
        age: data.age as number | undefined,
        bio: data.bio as string | undefined,
        photos: (data.photos as string[]) || [],
        interests: userInterests,
        prompts: data.prompts as WeeklyPick['prompts'],
        isVerified: data.isVerified as boolean || false,
        compatibilityScore,
        pickReason,
        expiresAt: weekEnd.toISOString(),
      });
    }

    // Sort by compatibility score and return top 10
    picks.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));
    return picks.slice(0, 10);
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
