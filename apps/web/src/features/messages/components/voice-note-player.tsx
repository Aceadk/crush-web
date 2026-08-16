'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@crush/ui';
import { Play, Pause, Loader2 } from 'lucide-react';

interface VoiceNotePlayerProps {
  audioUrl: string;
  duration?: number;
  isOwn?: boolean;
}

export function VoiceNotePlayer({ audioUrl, duration = 0, isOwn = false }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Format time in MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const syncLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsLoading(false);
    setHasPlaybackError(false);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setAudioDuration(audio.duration);
    }
  }, []);

  // Reset and explicitly load whenever a realtime/optimistic message swaps in
  // the canonical URL. Short mobile notes are often already cached by the time
  // React effects run, so also inspect readyState instead of relying solely on
  // loadedmetadata/canplay events that may already have fired.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setIsPlaying(false);
    setIsLoading(true);
    setHasPlaybackError(false);
    setCurrentTime(0);
    setAudioDuration(duration);
    audio.load();
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      syncLoadedMetadata();
    }
  }, [audioUrl, duration, syncLoadedMetadata]);

  // Handle play/pause from the media element's real state. play() can reject
  // for a transient browser/network reason; keep the UI truthful and let the
  // user retry instead of leaving a fake playing state.
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      setHasPlaybackError(false);
      await audio.play();
    } catch {
      setIsPlaying(false);
      setIsLoading(false);
      setHasPlaybackError(true);
    }
  }, []);

  // Handle seeking
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * audioDuration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div
      className={cn(
        'flex min-w-[180px] max-w-[240px] items-center gap-3',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={syncLoadedMetadata}
        onCanPlay={() => setIsLoading(false)}
        onPlaying={() => {
          setIsPlaying(true);
          setHasPlaybackError(false);
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={(event) => {
          setIsPlaying(false);
          setCurrentTime(0);
          event.currentTarget.currentTime = 0;
        }}
        onError={() => {
          setIsPlaying(false);
          setIsLoading(false);
          setHasPlaybackError(true);
        }}
      />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        aria-label={
          isLoading
            ? 'Loading voice message'
            : isPlaying
              ? 'Pause voice message'
              : hasPlaybackError
                ? 'Retry voice message'
                : 'Play voice message'
        }
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors',
          isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/20 hover:bg-primary/30',
          hasPlaybackError && 'ring-1 ring-red-400/70'
        )}
      >
        {isLoading ? (
          <Loader2
            className={cn('h-5 w-5 animate-spin', isOwn ? 'text-white/70' : 'text-primary/70')}
          />
        ) : isPlaying ? (
          <Pause className={cn('h-5 w-5', isOwn ? 'text-white' : 'text-primary')} />
        ) : (
          <Play className={cn('ml-0.5 h-5 w-5', isOwn ? 'text-white' : 'text-primary')} />
        )}
      </button>

      {/* Waveform / Progress */}
      <div className="flex flex-1 flex-col gap-1">
        {/* Progress bar */}
        <div
          onClick={handleSeek}
          className={cn(
            'flex h-8 cursor-pointer items-center gap-0.5',
            isOwn ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          {/* Waveform bars */}
          {[...Array(20)].map((_, i) => {
            const barProgress = (i / 20) * 100;
            const isActive = barProgress <= progress;
            const heights = [
              40, 60, 80, 50, 70, 90, 45, 75, 55, 85, 65, 95, 40, 70, 50, 80, 60, 90, 55, 75,
            ];

            return (
              <div
                key={i}
                className={cn(
                  'w-1 rounded-full transition-colors',
                  isOwn
                    ? isActive
                      ? 'bg-white'
                      : 'bg-white/40'
                    : isActive
                      ? 'bg-primary'
                      : 'bg-gray-300 dark:bg-gray-500'
                )}
                style={{ height: `${heights[i]}%` }}
              />
            );
          })}
        </div>

        {/* Time display */}
        <div
          className={cn(
            'flex justify-between text-xs',
            isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>
      </div>
    </div>
  );
}
