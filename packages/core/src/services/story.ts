import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase/config';
import {
  filterActiveStories,
  ProfileStory,
  sortStoriesByNewest,
  StoryMediaType,
  STORY_DEFAULT_DURATION_HOURS,
  STORY_MAX_STORIES_PER_USER,
} from '../types/story';
import { storageService, UploadProgress } from './storage';

const USERS_COLLECTION = 'users';
const STORIES_SUBCOLLECTION = 'stories';
const STORY_VIEWS_SUBCOLLECTION = 'views';
const DEFAULT_FETCH_LIMIT = 25;

interface GetStoriesOptions {
  activeOnly?: boolean;
  maxItems?: number;
}

interface CreateStoryInput {
  userId: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  thumbnailUrl?: string;
  expiresInHours?: number;
}

interface CreateStoryFromFileInput {
  userId: string;
  file: File;
  thumbnailUrl?: string;
  expiresInHours?: number;
  onProgress?: (progress: UploadProgress) => void;
}

interface MarkStoryViewedInput {
  ownerUserId: string;
  storyId: string;
  viewerId: string;
}

class StoryService {
  private toIso(value: unknown): string | undefined {
    if (!value) return undefined;

    if (value instanceof Timestamp) {
      return value.toDate().toISOString();
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (Number.isNaN(parsed)) return undefined;
      return new Date(parsed).toISOString();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Date(value).toISOString();
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
      const asDate = (value as { toDate: () => Date }).toDate();
      if (Number.isNaN(asDate.getTime())) return undefined;
      return asDate.toISOString();
    }

    return undefined;
  }

  private inferStoryMediaType(file: File): StoryMediaType {
    return file.type.startsWith('video/') ? 'video' : 'photo';
  }

  private mapDocToStory(
    userId: string,
    id: string,
    data: Record<string, unknown>
  ): ProfileStory | null {
    const mediaUrl = typeof data.mediaUrl === 'string' ? data.mediaUrl : '';
    if (!mediaUrl) return null;

    const mediaType: StoryMediaType = data.mediaType === 'video' ? 'video' : 'photo';
    const createdAt = this.toIso(data.createdAt) ?? new Date().toISOString();
    const expiresAt =
      this.toIso(data.expiresAt) ??
      new Date(
        Date.parse(createdAt) + STORY_DEFAULT_DURATION_HOURS * 60 * 60 * 1000
      ).toISOString();

    const viewCountRaw = data.viewCount;
    const viewCount =
      typeof viewCountRaw === 'number' && Number.isFinite(viewCountRaw)
        ? viewCountRaw
        : 0;

    return {
      id,
      userId,
      mediaUrl,
      mediaType,
      createdAt,
      expiresAt,
      viewCount,
      thumbnailUrl:
        typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : undefined,
    };
  }

  async getStoriesForUser(
    userId: string,
    options: GetStoriesOptions = {}
  ): Promise<ProfileStory[]> {
    const db = getFirebaseDb();
    const maxItems = Math.min(Math.max(options.maxItems ?? DEFAULT_FETCH_LIMIT, 1), 50);

    const storiesQuery = query(
      collection(db, USERS_COLLECTION, userId, STORIES_SUBCOLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );

    const snapshot = await getDocs(storiesQuery);
    const stories = snapshot.docs
      .map((storyDoc) =>
        this.mapDocToStory(
          userId,
          storyDoc.id,
          storyDoc.data() as Record<string, unknown>
        )
      )
      .filter((story): story is ProfileStory => Boolean(story));

    const activeOnly = options.activeOnly ?? true;
    const filtered = activeOnly ? filterActiveStories(stories) : stories;

    return sortStoriesByNewest(filtered);
  }

  async getStoriesForUsers(
    userIds: string[],
    options: GetStoriesOptions = {}
  ): Promise<Record<string, ProfileStory[]>> {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

    if (uniqueUserIds.length === 0) {
      return {};
    }

    const entries = await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const stories = await this.getStoriesForUser(userId, options);
        return [userId, stories] as const;
      })
    );

    return Object.fromEntries(entries);
  }

  async createStory({
    userId,
    mediaUrl,
    mediaType,
    thumbnailUrl,
    expiresInHours,
  }: CreateStoryInput): Promise<ProfileStory> {
    const db = getFirebaseDb();
    const activeStories = await this.getStoriesForUser(userId, {
      activeOnly: true,
      maxItems: STORY_MAX_STORIES_PER_USER * 2,
    });

    if (activeStories.length >= STORY_MAX_STORIES_PER_USER) {
      throw new Error(
        `Story limit reached. You can keep up to ${STORY_MAX_STORIES_PER_USER} active stories.`
      );
    }

    const durationHours = Math.max(1, expiresInHours ?? STORY_DEFAULT_DURATION_HOURS);
    const createdAt = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(
      createdAt.toMillis() + durationHours * 60 * 60 * 1000
    );

    const storiesCollectionRef = collection(
      db,
      USERS_COLLECTION,
      userId,
      STORIES_SUBCOLLECTION
    );
    const storyRef = doc(storiesCollectionRef);

    await setDoc(storyRef, {
      userId,
      mediaUrl,
      mediaType,
      thumbnailUrl: thumbnailUrl ?? null,
      createdAt,
      expiresAt,
      viewCount: 0,
      updatedAt: serverTimestamp(),
    });

    return {
      id: storyRef.id,
      userId,
      mediaUrl,
      mediaType,
      createdAt: createdAt.toDate().toISOString(),
      expiresAt: expiresAt.toDate().toISOString(),
      viewCount: 0,
      thumbnailUrl,
    };
  }

  async createStoryFromFile({
    userId,
    file,
    thumbnailUrl,
    expiresInHours,
    onProgress,
  }: CreateStoryFromFileInput): Promise<ProfileStory> {
    const mediaType = this.inferStoryMediaType(file);
    const mediaUrl = await storageService.uploadStoryMedia(
      userId,
      file,
      onProgress
    );

    return this.createStory({
      userId,
      mediaUrl,
      mediaType,
      thumbnailUrl,
      expiresInHours,
    });
  }

  async removeStory(
    userId: string,
    storyId: string,
    options?: { deleteMedia?: boolean }
  ): Promise<void> {
    const db = getFirebaseDb();
    const storyRef = doc(db, USERS_COLLECTION, userId, STORIES_SUBCOLLECTION, storyId);
    const shouldDeleteMedia = options?.deleteMedia ?? true;

    let mediaUrl: string | undefined;
    if (shouldDeleteMedia) {
      const snapshot = await getDoc(storyRef);
      const snapshotData = snapshot.data() as Record<string, unknown> | undefined;
      mediaUrl =
        typeof snapshotData?.mediaUrl === 'string' ? snapshotData.mediaUrl : undefined;
    }

    await deleteDoc(storyRef);

    if (mediaUrl) {
      try {
        await storageService.deleteFile(mediaUrl);
      } catch (error) {
        console.warn('Failed to delete story media from storage:', error);
      }
    }
  }

  async markStoryViewed({
    ownerUserId,
    storyId,
    viewerId,
  }: MarkStoryViewedInput): Promise<boolean> {
    if (!ownerUserId || !storyId || !viewerId || ownerUserId === viewerId) {
      return false;
    }

    const db = getFirebaseDb();
    const storyRef = doc(db, USERS_COLLECTION, ownerUserId, STORIES_SUBCOLLECTION, storyId);
    const storyViewRef = doc(
      db,
      USERS_COLLECTION,
      ownerUserId,
      STORIES_SUBCOLLECTION,
      storyId,
      STORY_VIEWS_SUBCOLLECTION,
      viewerId
    );

    let wasRecorded = false;

    await runTransaction(db, async (transaction) => {
      const storySnapshot = await transaction.get(storyRef);
      if (!storySnapshot.exists()) {
        throw new Error('Story not found');
      }

      const existingViewSnapshot = await transaction.get(storyViewRef);
      if (existingViewSnapshot.exists()) {
        return;
      }

      transaction.set(storyViewRef, {
        viewerId,
        viewedAt: serverTimestamp(),
      });

      transaction.update(storyRef, {
        viewCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      wasRecorded = true;
    });

    return wasRecorded;
  }
}

export const storyService = new StoryService();
