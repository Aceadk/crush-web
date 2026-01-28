'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  Mic,
  Square,
  Send,
  Trash2,
  Loader2,
  Play,
  Pause,
} from 'lucide-react';

interface VoiceNoteRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => Promise<void>;
  onCancel: () => void;
  maxDuration?: number; // in seconds
}

export function VoiceNoteRecorder({
  onSend,
  onCancel,
  maxDuration = 60,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Unable to access microphone. Please check your permissions.');
    }
  }, [maxDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, audioUrl]);

  const handleDelete = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  }, [audioUrl]);

  const handleSend = useCallback(async () => {
    if (!audioBlob) return;

    setIsSending(true);
    try {
      await onSend(audioBlob, recordingTime);
      handleDelete();
      onCancel();
    } catch (error) {
      console.error('Failed to send voice note:', error);
    } finally {
      setIsSending(false);
    }
  }, [audioBlob, recordingTime, onSend, handleDelete, onCancel]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle audio ended
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
    }
  }, [audioUrl]);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
      {/* Hidden audio element */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} className="hidden" />
      )}

      {/* Recording state */}
      {isRecording ? (
        <>
          {/* Recording indicator */}
          <div className="flex items-center gap-2 flex-1">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Recording...
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatTime(recordingTime)} / {formatTime(maxDuration)}
            </span>
          </div>

          {/* Waveform visualization */}
          <div className="flex items-center gap-0.5 h-8">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* Stop button */}
          <Button
            size="sm"
            variant="destructive"
            onClick={stopRecording}
            className="rounded-full w-10 h-10 p-0"
          >
            <Square className="w-4 h-4" />
          </Button>
        </>
      ) : audioBlob ? (
        <>
          {/* Playback controls */}
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Duration */}
          <div className="flex-1">
            <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: isPlaying ? '100%' : '0%' }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
              {formatTime(recordingTime)}
            </span>
          </div>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="p-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Send button */}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isSending}
            className="rounded-full"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
                Send
              </>
            )}
          </Button>
        </>
      ) : (
        <>
          {/* Initial state - ready to record */}
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tap to record a voice message
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Max {maxDuration} seconds
            </p>
          </div>

          {/* Record button */}
          <Button
            size="sm"
            onClick={startRecording}
            className="rounded-full bg-red-500 hover:bg-red-600"
          >
            <Mic className="w-4 h-4 mr-1" />
            Record
          </Button>

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
