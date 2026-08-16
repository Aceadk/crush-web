import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceNotePlayer } from '../voice-note-player';

describe('VoiceNotePlayer', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function (
      this: HTMLMediaElement
    ) {
      // Model a small cached mobile note whose metadata is already available
      // before React's effect can attach an imperative event listener.
      Object.defineProperty(this, 'readyState', {
        configurable: true,
        value: HTMLMediaElement.HAVE_METADATA,
      });
      Object.defineProperty(this, 'duration', {
        configurable: true,
        value: 2.2,
      });
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('enables playback when cached metadata events were already missed', async () => {
    render(<VoiceNotePlayer audioUrl="https://firebasestorage.googleapis.com/mobile-note.m4a" />);

    const playButton = await screen.findByRole('button', {
      name: 'Play voice message',
    });
    expect(playButton).toBeEnabled();
    expect(screen.getByText('0:02')).toBeInTheDocument();

    fireEvent.click(playButton);
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1));
  }, 15_000);

  it('offers a silent retry after a media load error', async () => {
    const { container } = render(
      <VoiceNotePlayer audioUrl="https://firebasestorage.googleapis.com/mobile-note.m4a" />
    );
    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();

    fireEvent.error(audio!);
    const retryButton = await screen.findByRole('button', {
      name: 'Retry voice message',
    });
    expect(retryButton).toBeEnabled();

    fireEvent.click(retryButton);
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1));
  }, 15_000);
});
