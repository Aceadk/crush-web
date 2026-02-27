/**
 * Profile story types
 */

export type StoryMediaType = 'photo' | 'video';

export interface ProfileStory {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  thumbnailUrl?: string;
}

export const STORY_DEFAULT_DURATION_HOURS = 24;
export const STORY_PHOTO_DURATION_MS = 5_000;
export const STORY_MAX_VIDEO_DURATION_SECONDS = 15;
export const STORY_MAX_STORIES_PER_USER = 5;

export function getStoryExpirationMs(story: ProfileStory): number {
  const ms = Date.parse(story.expiresAt);
  return Number.isNaN(ms) ? 0 : ms;
}

export function isStoryActive(
  story: ProfileStory,
  nowMs: number = Date.now()
): boolean {
  return getStoryExpirationMs(story) > nowMs;
}

export function getStoryRemainingMs(
  story: ProfileStory,
  nowMs: number = Date.now()
): number {
  return Math.max(0, getStoryExpirationMs(story) - nowMs);
}

export function sortStoriesByNewest(stories: ProfileStory[]): ProfileStory[] {
  return [...stories].sort((a, b) => {
    const aMs = Date.parse(a.createdAt);
    const bMs = Date.parse(b.createdAt);
    if (Number.isNaN(aMs) || Number.isNaN(bMs)) return 0;
    return bMs - aMs;
  });
}

export function filterActiveStories(
  stories: ProfileStory[],
  nowMs: number = Date.now()
): ProfileStory[] {
  return stories.filter((story) => isStoryActive(story, nowMs));
}
