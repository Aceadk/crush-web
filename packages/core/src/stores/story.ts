import { create } from 'zustand';
import { errorText } from '../utils/errors';
import { storyService } from '../services/story';
import { UploadProgress } from '../services/storage';
import { ProfileStory, sortStoriesByNewest } from '../types/story';

interface StoryState {
  storiesByUser: Record<string, ProfileStory[]>;
  viewedStoryIdsByUser: Record<string, string[]>;
  loadingUsers: Record<string, boolean>;
  loading: boolean;
  uploading: boolean;
  uploadProgress: number | null;
  error: string | null;

  loadStoriesForUser: (userId: string) => Promise<void>;
  loadStoriesForUsers: (userIds: string[]) => Promise<void>;
  createStoryFromFile: (
    userId: string,
    file: File,
    options?: {
      expiresInHours?: number;
      onProgress?: (progress: UploadProgress) => void;
    }
  ) => Promise<ProfileStory>;
  removeStory: (userId: string, storyId: string) => Promise<void>;
  markStoryViewed: (
    ownerUserId: string,
    storyId: string,
    viewerId: string
  ) => Promise<void>;
  clearError: () => void;
}

export const useStoryStore = create<StoryState>()((set, get) => ({
  storiesByUser: {},
  viewedStoryIdsByUser: {},
  loadingUsers: {},
  loading: false,
  uploading: false,
  uploadProgress: null,
  error: null,

  loadStoriesForUser: async (userId) => {
    if (!userId) return;

    set((state) => ({
      loading: true,
      error: null,
      loadingUsers: {
        ...state.loadingUsers,
        [userId]: true,
      },
    }));

    try {
      const stories = await storyService.getStoriesForUser(userId);
      set((state) => ({
        storiesByUser: {
          ...state.storiesByUser,
          [userId]: stories,
        },
        loadingUsers: {
          ...state.loadingUsers,
          [userId]: false,
        },
        loading: false,
      }));
    } catch (error) {
      const message =
        errorText(error, 'Failed to load stories');
      set((state) => ({
        error: message,
        loadingUsers: {
          ...state.loadingUsers,
          [userId]: false,
        },
        loading: false,
      }));
    }
  },

  loadStoriesForUsers: async (userIds) => {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) return;

    set((state) => ({
      loading: true,
      error: null,
      loadingUsers: {
        ...state.loadingUsers,
        ...Object.fromEntries(uniqueUserIds.map((userId) => [userId, true])),
      },
    }));

    try {
      const storiesByUser = await storyService.getStoriesForUsers(uniqueUserIds);

      set((state) => ({
        storiesByUser: {
          ...state.storiesByUser,
          ...storiesByUser,
        },
        loadingUsers: {
          ...state.loadingUsers,
          ...Object.fromEntries(uniqueUserIds.map((userId) => [userId, false])),
        },
        loading: false,
      }));
    } catch (error) {
      const message =
        errorText(error, 'Failed to load stories');
      set((state) => ({
        error: message,
        loadingUsers: {
          ...state.loadingUsers,
          ...Object.fromEntries(uniqueUserIds.map((userId) => [userId, false])),
        },
        loading: false,
      }));
    }
  },

  createStoryFromFile: async (userId, file, options) => {
    set({
      uploading: true,
      uploadProgress: 0,
      error: null,
    });

    try {
      const story = await storyService.createStoryFromFile({
        userId,
        file,
        expiresInHours: options?.expiresInHours,
        onProgress: (progress) => {
          set({ uploadProgress: progress.progress });
          options?.onProgress?.(progress);
        },
      });

      set((state) => {
        const existing = state.storiesByUser[userId] ?? [];
        const deduped = [story, ...existing.filter((item) => item.id !== story.id)];

        return {
          storiesByUser: {
            ...state.storiesByUser,
            [userId]: sortStoriesByNewest(deduped),
          },
          uploading: false,
          uploadProgress: null,
        };
      });

      return story;
    } catch (error) {
      const message =
        errorText(error, 'Failed to create story');
      set({
        error: message,
        uploading: false,
        uploadProgress: null,
      });
      throw error;
    }
  },

  removeStory: async (userId, storyId) => {
    try {
      await storyService.removeStory(userId, storyId);
      set((state) => ({
        storiesByUser: {
          ...state.storiesByUser,
          [userId]: (state.storiesByUser[userId] ?? []).filter(
            (story) => story.id !== storyId
          ),
        },
      }));
    } catch (error) {
      const message =
        errorText(error, 'Failed to remove story');
      set({ error: message });
      throw error;
    }
  },

  markStoryViewed: async (ownerUserId, storyId, viewerId) => {
    const viewedByOwner = get().viewedStoryIdsByUser[ownerUserId] ?? [];
    if (!viewedByOwner.includes(storyId)) {
      set((state) => ({
        viewedStoryIdsByUser: {
          ...state.viewedStoryIdsByUser,
          [ownerUserId]: [...viewedByOwner, storyId],
        },
      }));
    }

    try {
      const recorded = await storyService.markStoryViewed({
        ownerUserId,
        storyId,
        viewerId,
      });

      if (!recorded) {
        return;
      }

      set((state) => ({
        storiesByUser: {
          ...state.storiesByUser,
          [ownerUserId]: (state.storiesByUser[ownerUserId] ?? []).map((story) =>
            story.id === storyId
              ? { ...story, viewCount: story.viewCount + 1 }
              : story
          ),
        },
      }));
    } catch (error) {
      const message =
        errorText(error, 'Failed to mark story viewed');
      set({ error: message });
    }
  },

  clearError: () => set({ error: null }),
}));
