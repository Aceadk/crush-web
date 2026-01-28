'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@crush/ui';
import { Play, Pause, Loader2 } from 'lucide-react';

interface VoiceNotePlayerProps {
  audioUrl: string;
  duration?: number;
  isOwn?: boolean;
}

export function VoiceNotePlayer({
  audioUrl,
  duration = 0,
  isOwn = false,
}: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Format time in MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
    };
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
        'flex items-center gap-3 min-w-[180px] max-w-[240px]',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
          isOwn
            ? 'bg-white/20 hover:bg-white/30'
            : 'bg-primary/20 hover:bg-primary/30'
        )}
      >
        {isLoading ? (
          <Loader2
            className={cn(
              'w-5 h-5 animate-spin',
              isOwn ? 'text-white/70' : 'text-primary/70'
            )}
          />
        ) : isPlaying ? (
          <Pause
            className={cn('w-5 h-5', isOwn ? 'text-white' : 'text-primary')}
          />
        ) : (
          <Play
            className={cn(
              'w-5 h-5 ml-0.5',
              isOwn ? 'text-white' : 'text-primary'
            )}
          />
        )}
      </button>

      {/* Waveform / Progress */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Progress bar */}
        <div
          onClick={handleSeek}
          className={cn(
            'h-8 flex items-center gap-0.5 cursor-pointer',
            isOwn ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          {/* Waveform bars */}
          {[...Array(20)].map((_, i) => {
            const barProgress = (i / 20) * 100;
            const isActive = barProgress <= progress;
            const heights = [40, 60, 80, 50, 70, 90, 45, 75, 55, 85, 65, 95, 40, 70, 50, 80, 60, 90, 55, 75];

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
