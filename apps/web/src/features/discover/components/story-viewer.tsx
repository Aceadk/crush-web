'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ProfileStory,
  sortStoriesByNewest,
  STORY_PHOTO_DURATION_MS,
  getStoryRemainingMs,
} from '@crush/core';
import { Badge, Button, cn } from '@crush/ui';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Video,
  X,
} from 'lucide-react';

interface StoryViewerProps {
  open: boolean;
  stories: ProfileStory[];
  ownerName: string;
  ownerPhoto?: string;
  initialIndex?: number;
  onOpenChange: (open: boolean) => void;
  onStoryViewed?: (storyId: string) => void;
}

function formatRemainingTime(story: ProfileStory): string {
  const remainingMs = getStoryRemainingMs(story);
  if (remainingMs <= 0) return 'Expired';

  const totalMinutes = Math.floor(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  if (minutes > 0) {
    return `${minutes}m left`;
  }

  return 'Less than 1m left';
}

export function StoryViewer({
  open,
  stories,
  ownerName,
  ownerPhoto,
  initialIndex = 0,
  onOpenChange,
  onStoryViewed,
}: StoryViewerProps) {
  const orderedStories = useMemo(() => sortStoriesByNewest(stories), [stories]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressMs, setProgressMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoDurationMs, setVideoDurationMs] = useState(STORY_PHOTO_DURATION_MS);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewedInSessionRef = useRef<Set<string>>(new Set());

  const currentStory = orderedStories[currentIndex];

  const closeViewer = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const goToNextStory = useCallback(() => {
    setProgressMs(0);
    setVideoDurationMs(STORY_PHOTO_DURATION_MS);
    setVideoError(false);

    setCurrentIndex((previousIndex) => {
      if (previousIndex >= orderedStories.length - 1) {
        closeViewer();
        return previousIndex;
      }
      return previousIndex + 1;
    });
  }, [closeViewer, orderedStories.length]);

  const goToPreviousStory = useCallback(() => {
    setCurrentIndex((previousIndex) => {
      const nextIndex = Math.max(0, previousIndex - 1);
      if (nextIndex !== previousIndex) {
        setProgressMs(0);
        setVideoDurationMs(STORY_PHOTO_DURATION_MS);
        setVideoError(false);
      }
      return nextIndex;
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setPaused(false);
      setProgressMs(0);
      setCurrentIndex(0);
      setVideoDurationMs(STORY_PHOTO_DURATION_MS);
      setVideoError(false);
      viewedInSessionRef.current.clear();
      return;
    }

    const maxIndex = Math.max(orderedStories.length - 1, 0);
    const clamped = Math.min(Math.max(initialIndex, 0), maxIndex);
    setCurrentIndex(clamped);
    setProgressMs(0);
    setPaused(false);
    setVideoDurationMs(STORY_PHOTO_DURATION_MS);
    setVideoError(false);
  }, [open, initialIndex, orderedStories.length]);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    if (!open || !currentStory) return;

    if (viewedInSessionRef.current.has(currentStory.id)) {
      return;
    }

    viewedInSessionRef.current.add(currentStory.id);
    onStoryViewed?.(currentStory.id);
  }, [open, currentStory, onStoryViewed]);

  useEffect(() => {
    if (!open || !currentStory || paused || currentStory.mediaType !== 'photo') {
      return;
    }

    const durationMs = STORY_PHOTO_DURATION_MS;
    const startAt = performance.now() - progressMs;
    let frameId = 0;

    const tick = (now: number) => {
      const elapsed = now - startAt;
      if (elapsed >= durationMs) {
        setProgressMs(durationMs);
        goToNextStory();
        return;
      }

      setProgressMs(elapsed);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [open, currentStory, paused, progressMs, goToNextStory]);

  useEffect(() => {
    if (!open || !currentStory || currentStory.mediaType !== 'video') {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (paused) {
      video.pause();
      return;
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignore autoplay errors; user can tap to continue.
      });
    }
  }, [open, currentStory, paused]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeViewer();
        return;
      }
      if (event.key === 'ArrowRight') {
        goToNextStory();
        return;
      }
      if (event.key === 'ArrowLeft') {
        goToPreviousStory();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, closeViewer, goToNextStory, goToPreviousStory]);

  if (!open || !currentStory) {
    return null;
  }

  const durationMs =
    currentStory.mediaType === 'video'
      ? Math.max(videoDurationMs, 1000)
      : STORY_PHOTO_DURATION_MS;
  const currentProgress = Math.min(1, Math.max(0, progressMs / durationMs));

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${ownerName} stories`}
    >
      <div className="relative w-full max-w-md aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0">
          {currentStory.mediaType === 'video' ? (
            <>
              <video
                ref={videoRef}
                key={currentStory.id}
                src={currentStory.mediaUrl}
                className="w-full h-full object-cover"
                playsInline
                muted
                onLoadedMetadata={(event) => {
                  const duration = event.currentTarget.duration;
                  if (Number.isFinite(duration) && duration > 0) {
                    setVideoDurationMs(duration * 1000);
                  }
                }}
                onTimeUpdate={(event) => {
                  setProgressMs(event.currentTarget.currentTime * 1000);
                }}
                onEnded={goToNextStory}
                onError={() => {
                  setVideoError(true);
                }}
              />
              {videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-black/70">
                  <Video className="w-8 h-8" />
                  <p className="text-sm">Video unavailable</p>
                </div>
              )}
            </>
          ) : (
            <Image
              key={currentStory.id}
              src={currentStory.mediaUrl}
              alt={`${ownerName} story`}
              fill
              className="object-cover"
              unoptimized
            />
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/35" />

        <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 space-y-3">
          <div className="flex gap-1">
            {orderedStories.map((story, index) => {
              const progress =
                index < currentIndex
                  ? 1
                  : index > currentIndex
                  ? 0
                  : currentProgress;

              return (
                <div
                  key={story.id}
                  className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-[width] duration-75"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-full overflow-hidden border border-white/40 relative shrink-0">
                {ownerPhoto ? (
                  <Image
                    src={ownerPhoto}
                    alt={ownerName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center bg-white/20 text-white text-sm font-semibold">
                    {ownerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{ownerName}</p>
                <p className="text-xs text-white/80 truncate">{formatRemainingTime(currentStory)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {currentStory.mediaType === 'video' ? (
                  <Video className="w-3 h-3 mr-1" />
                ) : (
                  <Camera className="w-3 h-3 mr-1" />
                )}
                {currentIndex + 1}/{orderedStories.length}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                onClick={closeViewer}
                aria-label="Close stories"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={goToPreviousStory}
          className={cn(
            'absolute inset-y-0 left-0 w-1/3',
            currentIndex === 0 ? 'cursor-default' : 'cursor-pointer'
          )}
          aria-label="Previous story"
        />
        <button
          type="button"
          onClick={goToNextStory}
          className="absolute inset-y-0 right-0 w-1/3 cursor-pointer"
          aria-label="Next story"
        />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-9 w-9 bg-white/20 border border-white/30 text-white hover:bg-white/30"
            onClick={goToPreviousStory}
            disabled={currentIndex === 0}
            aria-label="Show previous story"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-9 w-9 bg-white/20 border border-white/30 text-white hover:bg-white/30"
            onClick={() => setPaused((previous) => !previous)}
            aria-label={paused ? 'Resume story playback' : 'Pause story playback'}
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-9 w-9 bg-white/20 border border-white/30 text-white hover:bg-white/30"
            onClick={goToNextStory}
            aria-label="Show next story"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
