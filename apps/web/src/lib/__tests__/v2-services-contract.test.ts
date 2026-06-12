/**
 * Contract tests for the V2 backend-aligned chat/match services.
 *
 * These verify that MessageServiceV2 and MatchServiceV2 route mutations through
 * the backend callables (not direct Firestore writes) and map between the
 * canonical backend schema and the web DTOs correctly.
 *
 * Request/response shapes were verified against functions/src/index.ts on
 * 2026-06-05. See docs/reports/web_chat_match_migration_plan_2026-06-05.md.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ─── Mock the Firebase boundary ──────────────────────────────────────────────
const { callableMock, firestoreMock } = vi.hoisted(() => ({
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
  firestoreMock: {
    getDoc: vi.fn(),
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
  getDoc: (...args: unknown[]) => firestoreMock.getDoc(...args),
  Timestamp: class {},
}));

import { messageServiceV2 } from '@crush/core/services/message_v2';
import { matchServiceV2 } from '@crush/core/services/match_v2';

describe('MessageServiceV2 — callable contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sendMessage routes through sendMessage with explicit toUserId (no lookup)', async () => {
    callableMock.sendMessage.mockResolvedValue({ ok: true, messageId: 'msg-1' });

    const result = await messageServiceV2.sendMessage(
      'match-123',
      'Hello there',
      'text',
      { toUserId: 'other-uid' }
    );

    expect(callableMock.sendMessage).toHaveBeenCalledWith({
      matchId: 'match-123',
      toUserId: 'other-uid',
      type: 'text',
      content: 'Hello there',
      mediaUrl: undefined,
    });
    expect(result).toEqual({ messageId: 'msg-1' });
    // Should not need a Firestore lookup when toUserId is provided.
    expect(firestoreMock.getDoc).not.toHaveBeenCalled();
  });

  it('sendMessage resolves toUserId from the match doc when omitted', async () => {
    firestoreMock.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ userIds: ['viewer-uid', 'resolved-other'] }),
    });
    callableMock.sendMessage.mockResolvedValue({ ok: true, messageId: 'msg-2' });

    await messageServiceV2.sendMessage('match-123', 'hi', 'text');

    expect(firestoreMock.getDoc).toHaveBeenCalled();
    expect(callableMock.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ toUserId: 'resolved-other' })
    );
  });

  it('maps web-only "gif" type to backend "image"', async () => {
    callableMock.sendMessage.mockResolvedValue({ ok: true, messageId: 'm' });
    await messageServiceV2.sendMessage('match-123', 'gif-url', 'gif', {
      toUserId: 'other-uid',
      mediaUrl: 'gif-url',
    });
    expect(callableMock.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image' })
    );
  });

  it('maps web-only "system" type to backend "text"', async () => {
    callableMock.sendMessage.mockResolvedValue({ ok: true, messageId: 'm' });
    await messageServiceV2.sendMessage('match-123', 'sys', 'system', {
      toUserId: 'other-uid',
    });
    expect(callableMock.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text' })
    );
  });

  it('unsendMessage routes through the unsendMessage callable', async () => {
    callableMock.unsendMessage.mockResolvedValue({ ok: true });
    await messageServiceV2.unsendMessage('match-123', 'msg-1');
    expect(callableMock.unsendMessage).toHaveBeenCalledWith({
      matchId: 'match-123',
      messageId: 'msg-1',
    });
  });

  it('editMessage routes through the editMessage callable', async () => {
    callableMock.editMessage.mockResolvedValue({ ok: true });
    await messageServiceV2.editMessage('match-123', 'msg-1', 'edited');
    expect(callableMock.editMessage).toHaveBeenCalledWith({
      matchId: 'match-123',
      messageId: 'msg-1',
      content: 'edited',
    });
  });

  it('markMessagesRead sends only matchId and returns markedCount', async () => {
    callableMock.markMessagesRead.mockResolvedValue({ ok: true, markedCount: 3 });
    const count = await messageServiceV2.markMessagesRead('match-123');
    expect(callableMock.markMessagesRead).toHaveBeenCalledWith({
      matchId: 'match-123',
    });
    expect(count).toBe(3);
  });

  it('addReaction passes emoji; removeReaction does NOT', async () => {
    callableMock.addReaction.mockResolvedValue({ ok: true });
    callableMock.removeReaction.mockResolvedValue({ ok: true });

    await messageServiceV2.addReaction('match-123', 'msg-1', '❤️');
    await messageServiceV2.removeReaction('match-123', 'msg-1');

    expect(callableMock.addReaction).toHaveBeenCalledWith({
      matchId: 'match-123',
      messageId: 'msg-1',
      emoji: '❤️',
    });
    expect(callableMock.removeReaction).toHaveBeenCalledWith({
      matchId: 'match-123',
      messageId: 'msg-1',
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

  it('getMediaSignedUrl uses filePath param and returns the backend url', async () => {
    callableMock.getChatMediaSignedUrl.mockResolvedValue({
      url: 'https://signed.example/x',
    });
    const url = await messageServiceV2.getMediaSignedUrl(
      'match-123',
      'matches/match-123/media/msg-1/file.jpg'
    );
    expect(callableMock.getChatMediaSignedUrl).toHaveBeenCalledWith({
      matchId: 'match-123',
      filePath: 'matches/match-123/media/msg-1/file.jpg',
    });
    expect(url).toBe('https://signed.example/x');
  });
});

describe('MatchServiceV2 — callable contract & DTO mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('swipeRight returns isMatch=false when not matched', async () => {
    callableMock.swipeRight.mockResolvedValue({ matched: false });
    const result = await matchServiceV2.swipeRight('target-1');
    expect(callableMock.swipeRight).toHaveBeenCalledWith({
      targetUserId: 'target-1',
      attachedMessage: undefined,
    });
    expect(result).toEqual({ isMatch: false, matchId: null, match: null });
    expect(firestoreMock.getDoc).not.toHaveBeenCalled();
  });

  it('swipeRight fetches the match doc when matched and maps it viewer-centric', async () => {
    callableMock.swipeRight.mockResolvedValue({
      matched: true,
      matchId: 'match-xyz',
    });
    firestoreMock.getDoc.mockResolvedValue({
      exists: () => true,
      id: 'match-xyz',
      data: () => ({
        userIds: ['viewer-uid', 'target-1'],
        status: 'active',
        createdAt: 1717545600000,
        lastMessageAt: 1717545600000,
        pinnedForUser: { 'viewer-uid': true },
        preMatchRequests: { 'viewer-uid': 2 },
        isSuperLike: true,
      }),
    });

    const result = await matchServiceV2.swipeRight('target-1', 'hey!');

    expect(callableMock.swipeRight).toHaveBeenCalledWith({
      targetUserId: 'target-1',
      attachedMessage: 'hey!',
    });
    expect(result.isMatch).toBe(true);
    expect(result.matchId).toBe('match-xyz');
    expect(result.match).toMatchObject({
      id: 'match-xyz',
      userId: 'viewer-uid',
      otherUserId: 'target-1',
      status: 'mutual', // 'active' → 'mutual'
      pinnedForUser: true,
      preMatchMessageRequestsCount: 2,
      isSuperLike: true,
      unreadCount: 0,
    });
  });

  it('swipeLeft routes through the swipeLeft callable', async () => {
    callableMock.swipeLeft.mockResolvedValue({ ok: true });
    await matchServiceV2.swipeLeft('target-1');
    expect(callableMock.swipeLeft).toHaveBeenCalledWith({
      targetUserId: 'target-1',
    });
  });

  it('unmatch routes through the unmatch callable', async () => {
    callableMock.unmatch.mockResolvedValue({ ok: true });
    await matchServiceV2.unmatch('match-123');
    expect(callableMock.unmatch).toHaveBeenCalledWith({ matchId: 'match-123' });
  });

  it('getMatch maps unmatched status correctly', async () => {
    firestoreMock.getDoc.mockResolvedValue({
      exists: () => true,
      id: 'match-1',
      data: () => ({
        userIds: ['viewer-uid', 'other'],
        status: 'unmatched',
        createdAt: 1,
      }),
    });
    const match = await matchServiceV2.getMatch('match-1');
    expect(match?.status).toBe('unmatched');
    expect(match?.otherUserId).toBe('other');
  });
});
