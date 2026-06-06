/**
 * Contract tests for the V2 backend-aligned chat/match services.
 *
 * These verify that MessageServiceV2 and MatchServiceV2 route mutations through
 * the backend callables (not direct Firestore writes) and map between the
 * canonical backend schema and the web DTOs correctly.
 *
 * See docs/reports/web_chat_match_migration_plan_2026-06-05.md (Option B).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ─── Mock the Firebase boundary ──────────────────────────────────────────────
// We mock the callables module so we can assert the exact requests the services
// emit, and the firebase/config so no real Firebase app is initialized.

const { callableMock } = vi.hoisted(() => ({
  callableMock: {
    swipeRight: vi.fn(),
    swipeLeft: vi.fn(),
    unmatch: vi.fn(),
    sendMessage: vi.fn(),
    unsendMessage: vi.fn(),
    editMessage: vi.fn(),
    markMessagesRead: vi.fn(),
    setTyping: vi.fn(),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    getChatMediaSignedUrl: vi.fn(),
  },
}));

vi.mock('@crush/core/api/callables', () => ({
  callables: callableMock,
}));

vi.mock('@crush/core/firebase/config', () => ({
  getFirebaseAuth: () => ({ currentUser: { uid: 'viewer-uid' } }),
  getFirebaseDb: () => ({}),
  getFirebaseFunctions: () => ({}),
}));

// Firestore read functions are not exercised in these tests (we only test the
// mutation/mapping paths), but they must resolve to no-ops.
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  startAfter: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  getDoc: vi.fn(),
  Timestamp: class {},
}));

import { messageServiceV2 } from '@crush/core/services/message_v2';
import { matchServiceV2 } from '@crush/core/services/match_v2';

describe('MessageServiceV2 — callable contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sendMessage routes through the sendMessage callable with mapped type', async () => {
    callableMock.sendMessage.mockResolvedValue({
      success: true,
      messageId: 'msg-1',
      timestamp: 1717545600000,
    });

    const result = await messageServiceV2.sendMessage(
      'match-123',
      'Hello there',
      'text'
    );

    expect(callableMock.sendMessage).toHaveBeenCalledWith({
      matchId: 'match-123',
      type: 'text',
      content: 'Hello there',
      mediaUrl: undefined,
    });
    expect(result).toEqual({ messageId: 'msg-1', timestamp: 1717545600000 });
  });

  it('maps web-only "gif" type to backend "image"', async () => {
    callableMock.sendMessage.mockResolvedValue({
      success: true,
      messageId: 'msg-2',
      timestamp: 1,
    });

    await messageServiceV2.sendMessage('match-123', 'gif-url', 'gif', 'gif-url');

    expect(callableMock.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image' })
    );
  });

  it('maps web-only "system" type to backend "text"', async () => {
    callableMock.sendMessage.mockResolvedValue({
      success: true,
      messageId: 'msg-3',
      timestamp: 1,
    });

    await messageServiceV2.sendMessage('match-123', 'sys', 'system');

    expect(callableMock.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text' })
    );
  });

  it('unsendMessage routes through the unsendMessage callable', async () => {
    callableMock.unsendMessage.mockResolvedValue({ success: true });
    await messageServiceV2.unsendMessage('match-123', 'msg-1');
    expect(callableMock.unsendMessage).toHaveBeenCalledWith({
      matchId: 'match-123',
      messageId: 'msg-1',
    });
  });

  it('editMessage routes through the editMessage callable', async () => {
    callableMock.editMessage.mockResolvedValue({ success: true });
    await messageServiceV2.editMessage('match-123', 'msg-1', 'edited');
    expect(callableMock.editMessage).toHaveBeenCalledWith({
      matchId: 'match-123',
      messageId: 'msg-1',
      content: 'edited',
    });
  });

  it('markMessagesRead routes through the markMessagesRead callable', async () => {
    callableMock.markMessagesRead.mockResolvedValue({ success: true });
    await messageServiceV2.markMessagesRead('match-123', 1717545600000);
    expect(callableMock.markMessagesRead).toHaveBeenCalledWith({
      matchId: 'match-123',
      upToTimestamp: 1717545600000,
    });
  });

  it('setTyping swallows errors (best-effort)', async () => {
    callableMock.setTyping.mockRejectedValue(new Error('network'));
    await expect(
      messageServiceV2.setTyping('match-123', true)
    ).resolves.toBeUndefined();
    expect(callableMock.setTyping).toHaveBeenCalledWith({
      matchId: 'match-123',
      isTyping: true,
    });
  });

  it('getMediaSignedUrl returns the backend url', async () => {
    callableMock.getChatMediaSignedUrl.mockResolvedValue({
      url: 'https://signed.example/x',
    });
    const url = await messageServiceV2.getMediaSignedUrl(
      'match-123',
      'matches/match-123/media/msg-1/file.jpg'
    );
    expect(url).toBe('https://signed.example/x');
  });
});

describe('MatchServiceV2 — callable contract & DTO mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('swipeRight returns isMatch=false when no match is created', async () => {
    callableMock.swipeRight.mockResolvedValue({ success: true });
    const result = await matchServiceV2.swipeRight('candidate-1');
    expect(callableMock.swipeRight).toHaveBeenCalledWith({
      candidateId: 'candidate-1',
      message: undefined,
    });
    expect(result).toEqual({ isMatch: false, match: null });
  });

  it('swipeRight maps the backend match DTO to a viewer-centric Match', async () => {
    callableMock.swipeRight.mockResolvedValue({
      success: true,
      match: {
        id: 'viewer-uid_candidate-1',
        userIds: ['viewer-uid', 'candidate-1'],
        status: 'active',
        createdAt: 1717545600000,
        updatedAt: 1717545600000,
        participants: {
          'viewer-uid': { unreadCount: 0 },
          'candidate-1': { unreadCount: 1 },
        },
        isSuperLike: true,
      },
    });

    const result = await matchServiceV2.swipeRight('candidate-1', 'hey!');

    expect(callableMock.swipeRight).toHaveBeenCalledWith({
      candidateId: 'candidate-1',
      message: 'hey!',
    });
    expect(result.isMatch).toBe(true);
    expect(result.match).toMatchObject({
      id: 'viewer-uid_candidate-1',
      userId: 'viewer-uid',
      otherUserId: 'candidate-1',
      status: 'mutual', // 'active' → 'mutual'
      isSuperLike: true,
      unreadCount: 0,
    });
  });

  it('swipeLeft routes through the swipeLeft callable', async () => {
    callableMock.swipeLeft.mockResolvedValue({ success: true });
    await matchServiceV2.swipeLeft('candidate-1');
    expect(callableMock.swipeLeft).toHaveBeenCalledWith({
      candidateId: 'candidate-1',
    });
  });

  it('unmatch routes through the unmatch callable', async () => {
    callableMock.unmatch.mockResolvedValue({ success: true });
    await matchServiceV2.unmatch('match-123');
    expect(callableMock.unmatch).toHaveBeenCalledWith({ matchId: 'match-123' });
  });
});
