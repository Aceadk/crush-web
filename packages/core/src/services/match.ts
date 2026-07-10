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
import {
  firebaseConfig,
  getFirebaseAuth,
  getFirebaseDb,
  getAppCheckHeaders,
} from '../firebase/config';
import {
  Match,
  MatchStatus,
  DiscoveryProfile,
  DiscoveryFilters,
  ReceivedLike,
  MessageRequest,
  WeeklyPick,
} from '../types/match';
import { buildDiscoveryRestUrl, mapDiscoveryRestProfiles } from './discovery_rest';
import { streakService } from './streak';
import { isPremiumUser } from './entitlement';
import { matchServiceV2 } from './match_v2';
import { mapUserDocumentToUserProfile, resolveUserProfilePhotos } from './user_document';

const MATCHES_COLLECTION = 'matches';
const SWIPES_COLLECTION = 'swipes';
const LIKES_COLLECTION = 'likes';
const USERS_COLLECTION = 'users';
const BLOCKS_COLLECTION = 'blocks';
const LEGACY_BLOCKED_SUBCOLLECTION = 'blocked';
const DAILY_LIKE_LIMIT_REACHED_ERROR = 'Daily like limit reached';

interface NormalizedGeoLocation {
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

class MatchService {
  private toFiniteNumber(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return undefined;
    }
    return value;
  }

  private normalizeGeoLocation(value: unknown): NormalizedGeoLocation | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const source = value as Record<string, unknown>;
    const latitude = this.toFiniteNumber(source.latitude);
    const longitude = this.toFiniteNumber(source.longitude);
    const city = typeof source.city === 'string' ? source.city.trim() : undefined;
    const country = typeof source.country === 'string' ? source.country.trim() : undefined;

    if (latitude === undefined && longitude === undefined && !city && !country) {
      return null;
    }

    return { latitude, longitude, city, country };
  }

  private getDiscoveryReferenceLocation(
    currentUserData: Record<string, unknown> | undefined
  ): NormalizedGeoLocation | null {
    if (!currentUserData) return null;

    const settings = (currentUserData.settings as Record<string, unknown> | undefined) ?? {};
    const passportMode = Boolean(settings.passportMode);
    const passportLocation = this.normalizeGeoLocation(settings.passportLocation);
    const profileLocation = this.normalizeGeoLocation(currentUserData.location);

    if (passportMode && passportLocation) {
      return passportLocation;
    }

    return profileLocation;
  }

  private calculateDistanceKm(
    from: NormalizedGeoLocation | null,
    to: NormalizedGeoLocation | null
  ): number | undefined {
    if (!from || !to) return undefined;
    if (
      from.latitude === undefined ||
      from.longitude === undefined ||
      to.latitude === undefined ||
      to.longitude === undefined
    ) {
      return undefined;
    }

    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(to.latitude - from.latitude);
    const dLon = toRadians(to.longitude - from.longitude);
    const lat1 = toRadians(from.latitude);
    const lat2 = toRadians(to.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(earthRadiusKm * c);
  }

  /**
   * Get user IDs that should be excluded from discovery because of blocking.
   * Supports both canonical `blocks` docs and legacy `users/{uid}/blocked` docs.
   */
  private async getDiscoveryBlockedUserIds(userId: string): Promise<Set<string>> {
    const db = getFirebaseDb();
    const blockedUserIds = new Set<string>();

    const [blockedByMeResult, blockedMeResult, legacyBlockedResult] = await Promise.allSettled([
      getDocs(query(collection(db, BLOCKS_COLLECTION), where('blockerId', '==', userId))),
      getDocs(query(collection(db, BLOCKS_COLLECTION), where('blockedId', '==', userId))),
      getDocs(collection(db, USERS_COLLECTION, userId, LEGACY_BLOCKED_SUBCOLLECTION)),
    ]);

    if (blockedByMeResult.status === 'fulfilled') {
      for (const blockDoc of blockedByMeResult.value.docs) {
        const blockedId = blockDoc.data().blockedId;
        if (typeof blockedId === 'string' && blockedId) {
          blockedUserIds.add(blockedId);
        }
      }
    }

    if (blockedMeResult.status === 'fulfilled') {
      for (const blockDoc of blockedMeResult.value.docs) {
        const blockerId = blockDoc.data().blockerId;
        if (typeof blockerId === 'string' && blockerId) {
          blockedUserIds.add(blockerId);
        }
      }
    }

    if (legacyBlockedResult.status === 'fulfilled') {
      for (const blockDoc of legacyBlockedResult.value.docs) {
        if (blockDoc.id) {
          blockedUserIds.add(blockDoc.id);
        }
      }
    }

    blockedUserIds.delete(userId);
    return blockedUserIds;
  }

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
  subscribeToMatches(userId: string, callback: (matches: Match[]) => void): Unsubscribe {
    const db = getFirebaseDb();

    const q = query(
      collection(db, MATCHES_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'mutual'),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const matches = snapshot.docs.map((doc) => this.mapDocToMatch(doc.id, doc.data()));
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
    const swipeId = `${swiperId}_${swipedUserId}`;
    const swipeRef = doc(db, SWIPES_COLLECTION, swipeId);
    const existingSwipe = await getDoc(swipeRef);
    const existingAction = existingSwipe.exists()
      ? (existingSwipe.data().action as string | undefined)
      : undefined;
    const isPositiveAction = action === 'like' || action === 'superlike';
    const alreadyCountedLike = existingAction === 'like' || existingAction === 'superlike';

    // Enforce daily like limits for first-time positive swipes only.
    if (isPositiveAction && !alreadyCountedLike) {
      const swiperDoc = await getDoc(doc(db, USERS_COLLECTION, swiperId));
      const isPremium = isPremiumUser(swiperDoc.data());
      const likeResult = await streakService.useLike(swiperId, isPremium);

      if (!likeResult.success) {
        throw new Error(likeResult.error || DAILY_LIKE_LIMIT_REACHED_ERROR);
      }
    }

    // Record the swipe
    await setDoc(swipeRef, {
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
    const otherUserPhoto = otherUserData
      ? resolveUserProfilePhotos(otherUserData).displayPhotoUrl
      : undefined;
    const userPhoto = userData ? resolveUserProfilePhotos(userData).displayPhotoUrl : undefined;

    const now = serverTimestamp();

    // Create match for user
    await setDoc(doc(db, MATCHES_COLLECTION, matchId), {
      userId,
      otherUserId,
      status: 'mutual',
      preMatchMessageRequestsCount: 0,
      pinnedForUser: false,
      otherUserName: otherUserData?.displayName || '',
      otherUserPhotoUrl: otherUserPhoto || '',
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
      otherUserPhotoUrl: userPhoto || '',
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
    const projectId = firebaseConfig.projectId?.trim();
    if (!projectId) {
      throw new Error('Firebase project is not configured');
    }

    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to load discovery profiles');
    }

    const token = await currentUser.getIdToken();
    // REST calls (unlike Firestore/callable SDKs) must attach the App Check
    // token manually; the backend enforces it in production.
    const appCheckHeaders = await getAppCheckHeaders();
    const response = await fetch(buildDiscoveryRestUrl(projectId, filters, pageSize), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...appCheckHeaders,
      },
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(
        typeof payload.error === 'string' ? payload.error : 'Failed to load discovery profiles'
      );
    }

    return mapDiscoveryRestProfiles(payload);
  }

  /**
   * Get users who have liked the current user (premium feature)
   */
  async getLikesReceived(userId: string): Promise<ReceivedLike[]> {
    const db = getFirebaseDb();

    // Likes are written by the backend swipeRight callable as
    // {fromUserId, toUserId, attachedMessage?, createdAt}. The previous query
    // read swipes.swipedUserId/timestamp — fields no live code path writes —
    // so this page always came back empty. toUserId+createdAt is backed by a
    // composite index and recipient-readable per firestore.rules.
    const likesQuery = query(
      collection(db, LIKES_COLLECTION),
      where('toUserId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const likesSnapshot = await getDocs(likesQuery);

    const matchedUserIds = await this.getCanonicalMatchedUserIds(userId);

    const receivedLikes: ReceivedLike[] = [];
    const seenLikers = new Set<string>();

    for (const likeDoc of likesSnapshot.docs) {
      const likeData = likeDoc.data();
      const likerUserId = likeData.fromUserId as string | undefined;

      if (!likerUserId || likerUserId === userId) continue;
      // Skip if already matched or duplicate liker
      if (matchedUserIds.has(likerUserId) || seenLikers.has(likerUserId)) continue;
      seenLikers.add(likerUserId);

      // Get liker's profile info
      const likerDoc = await getDoc(doc(db, USERS_COLLECTION, likerUserId));
      if (!likerDoc.exists()) continue;

      const likerData = likerDoc.data();
      const likerProfile = mapUserDocumentToUserProfile(likerUserId, likerData);

      receivedLikes.push({
        id: likeDoc.id,
        likerUserId,
        likerName: likerProfile.displayName || 'Unknown',
        likerPhotoUrl: resolveUserProfilePhotos(likerData).displayPhotoUrl,
        likerAge: likerProfile.age,
        // The backend likes schema does not record a super-like distinction.
        isSuperLike: false,
        timestamp: this.timestampToString(likeData.createdAt),
      });
    }

    return receivedLikes;
  }

  /**
   * Other-user ids from the canonical match model (userIds array +
   * status 'active'; legacy 'mutual' accepted). Status is filtered client-side
   * so the query stays on the built-in single-field index.
   */
  private async getCanonicalMatchedUserIds(userId: string): Promise<Set<string>> {
    const db = getFirebaseDb();
    const matchesQuery = query(
      collection(db, MATCHES_COLLECTION),
      where('userIds', 'array-contains', userId)
    );
    const matchesSnapshot = await getDocs(matchesQuery);

    const matchedUserIds = new Set<string>();
    matchesSnapshot.docs.forEach((matchDoc) => {
      const data = matchDoc.data();
      const status = (data.status as string | undefined) ?? '';
      if (status !== 'active' && status !== 'mutual') return;
      const userIds = Array.isArray(data.userIds) ? (data.userIds as string[]) : [];
      userIds.forEach((id) => {
        if (id && id !== userId) matchedUserIds.add(id);
      });
    });
    return matchedUserIds;
  }

  /**
   * Get message requests (messages from people who liked you but you haven't matched yet)
   * This is a premium feature
   */
  async getMessageRequests(userId: string): Promise<MessageRequest[]> {
    const db = getFirebaseDb();

    // Message requests are likes that carry an attachedMessage (written by the
    // backend swipeRight callable as {fromUserId, toUserId, attachedMessage,
    // createdAt}). The previous query read swipes.swipedUserId/timestamp —
    // fields no live code path writes — so this page always came back empty.
    const likesQuery = query(
      collection(db, LIKES_COLLECTION),
      where('toUserId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const likesSnapshot = await getDocs(likesQuery);

    const matchedUserIds = await this.getCanonicalMatchedUserIds(userId);

    const messageRequests: MessageRequest[] = [];
    const seenSenders = new Set<string>();

    for (const likeDoc of likesSnapshot.docs) {
      const likeData = likeDoc.data();
      const fromUserId = likeData.fromUserId as string | undefined;
      const message =
        typeof likeData.attachedMessage === 'string' ? likeData.attachedMessage.trim() : '';

      // Skip if no message, self, already matched, or duplicate sender
      if (!fromUserId || fromUserId === userId || !message) continue;
      if (matchedUserIds.has(fromUserId) || seenSenders.has(fromUserId)) continue;
      seenSenders.add(fromUserId);

      // Get sender's profile info
      const senderDoc = await getDoc(doc(db, USERS_COLLECTION, fromUserId));
      if (!senderDoc.exists()) continue;

      const senderData = senderDoc.data();
      const senderProfile = mapUserDocumentToUserProfile(fromUserId, senderData);

      messageRequests.push({
        id: likeDoc.id,
        fromUserId,
        fromUserName: senderProfile.displayName || 'Unknown',
        fromUserPhotoUrl: resolveUserProfilePhotos(senderData).displayPhotoUrl,
        fromUserAge: senderProfile.age,
        message,
        // The backend likes schema does not record a super-like distinction.
        isSuperLike: false,
        timestamp: this.timestampToString(likeData.createdAt),
      });
    }

    return messageRequests;
  }

  /**
   * Accept a message request (like the user back, creating a match).
   * Routed through the backend swipeRight callable — direct Firestore swipe
   * writes are rejected by the production security rules.
   */
  async acceptMessageRequest(userId: string, fromUserId: string): Promise<{ matchId: string }> {
    const result = await matchServiceV2.swipeRight(fromUserId);
    if (!result.isMatch || !result.matchId) {
      throw new Error('Failed to create match');
    }
    return { matchId: result.matchId };
  }

  /**
   * Decline a message request (pass on the user) via the backend callable.
   */
  async declineMessageRequest(userId: string, fromUserId: string): Promise<void> {
    await matchServiceV2.swipeLeft(fromUserId);
  }

  /**
   * Get weekly picks - curated profiles for the user
   * These are high-quality matches selected based on compatibility
   */
  async getWeeklyPicks(userId: string): Promise<WeeklyPick[]> {
    const db = getFirebaseDb();

    // Current user's interests for compatibility ranking (owner read).
    const currentUserDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    const currentUserData = currentUserDoc.data();
    const currentUserInterests = currentUserData
      ? mapUserDocumentToUserProfile(userId, currentUserData).interests || []
      : [];

    // Candidates come from the shared discovery deck endpoint so weekly picks
    // follow the SAME server-side discovery mode as the main deck (open mode:
    // every valid account; advanced mode: the filtered/ranked system) and
    // inherit its safety exclusions (self, blocked/reported both directions,
    // banned/deleted, already swiped). This used to query users on the
    // onboardingComplete/profileComplete flags — precomputed advanced-
    // eligibility values that kept hiding accounts while open discovery is
    // active. NaN filter values are simply not sent (buildDiscoveryRestUrl
    // only forwards finite numbers), so the server's own mode decides.
    const candidates = await this.getDiscoveryProfiles(
      userId,
      { minAge: Number.NaN, maxAge: Number.NaN, maxDistance: Number.NaN },
      50
    );

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay())); // End of week
    weekEnd.setHours(23, 59, 59, 999);

    const picks: WeeklyPick[] = candidates
      .filter((profile) => profile.id !== userId)
      .map((profile) => {
        const userInterests = profile.interests || [];

        // Calculate compatibility score based on shared interests
        const sharedInterests = currentUserInterests.filter((interest) =>
          userInterests.includes(interest)
        );
        const compatibilityScore =
          currentUserInterests.length > 0
            ? Math.round((sharedInterests.length / Math.max(currentUserInterests.length, 1)) * 100)
            : 50;

        // Determine pick reason
        let pickReason = 'Featured profile';
        if (sharedInterests.length >= 3) {
          pickReason = `${sharedInterests.length} shared interests`;
        } else if (profile.isVerified) {
          pickReason = 'Verified profile';
        } else if (profile.photos.length >= 3) {
          pickReason = 'Active user';
        }

        return {
          id: `pick_${profile.id}`,
          userId: profile.id,
          displayName: profile.displayName,
          age: profile.age,
          bio: profile.bio,
          photos: profile.photos,
          distance: profile.distance,
          interests: userInterests,
          prompts: profile.prompts,
          isVerified: profile.isVerified,
          compatibilityScore,
          pickReason,
          expiresAt: weekEnd.toISOString(),
        };
      });

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

  private getBoostExpiresAtMillis(data: Record<string, unknown>): number {
    const boost = (data.boost as Record<string, unknown> | undefined) ?? {};
    return this.timestampToMillis(boost.expiresAt);
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
      preMatchMessageRequestsCount: (data.preMatchMessageRequestsCount as number) || 0,
      pinnedForUser: (data.pinnedForUser as boolean) || false,
      otherUserName: data.otherUserName as string | undefined,
      otherUserPhotoUrl: data.otherUserPhotoUrl as string | undefined,
      createdAt: this.timestampToString(data.createdAt),
      updatedAt: this.timestampToString(data.updatedAt),
      lastMessageAt: this.timestampToString(data.lastMessageAt),
      lastMessage: data.lastMessage as string | undefined,
      unreadCount: (data.unreadCount as number) || 0,
      isSuperLike: data.isSuperLike as boolean | undefined,
    };
  }

  private timestampToOptionalString(timestamp: unknown): string | undefined {
    const ms = this.timestampToMillis(timestamp);
    if (!ms) return undefined;
    return new Date(ms).toISOString();
  }

  private timestampToMillis(timestamp: unknown): number {
    if (!timestamp) return 0;
    if (timestamp instanceof Timestamp) {
      return timestamp.toMillis();
    }
    if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      const parsed = Date.parse(timestamp);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (
      typeof timestamp === 'object' &&
      timestamp !== null &&
      'toDate' in timestamp &&
      typeof (timestamp as { toDate?: unknown }).toDate === 'function'
    ) {
      const asDate = (timestamp as { toDate: () => Date }).toDate();
      const ms = asDate.getTime();
      return Number.isNaN(ms) ? 0 : ms;
    }
    return 0;
  }

  private timestampToString(timestamp: unknown): string {
    if (!timestamp) return new Date().toISOString();
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
      return new Date(timestamp).toISOString();
    }
    if (typeof timestamp === 'string') return timestamp;
    return new Date().toISOString();
  }
}

export const matchService = new MatchService();
