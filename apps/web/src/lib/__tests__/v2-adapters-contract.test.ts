/**
 * Contract tests for the V2 store adapters.
 *
 * Verify that the adapters present the legacy store-facing surface but route to
 * the V2 services, and that the tricky mappings (conversation=match, typing
 * adaptation, reaction toggle direction, block-by-participant) are correct.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const { v2Mock, matchV2Mock, legacyMatchMock, callableMock, firestoreMock } =
  vi.hoisted(() => ({
    v2Mock: {
      subscribeToMessages: vi.fn(),
      subscribeToTyping: vi.fn(),
      getMessages: vi.fn(),
      sendMessage: vi.fn(),
      markMessagesRead: vi.fn(),
      setTyping: vi.fn(),
      addReaction: vi.fn(),
      removeReaction: vi.fn(),
      editMessage: vi.fn(),
      unsendMessage: vi.fn(),
    },
    matchV2Mock: {
      getMatches: vi.fn(),
      subscribeToMatches: vi.fn(),
      swipeLeft: vi.fn(),
      swipeRight: vi.fn(),
      unmatch: vi.fn(),
      setPinned: vi.fn(),
    },
    legacyMatchMock: {
      getDiscoveryProfiles: vi.fn(),
    },
    callableMock: {
      blockUser: vi.fn(),
      unblockUser: vi.fn(),
    },
    firestoreMock: { getDoc: vi.fn() },
  }));

vi.mock('@crush/core/services/message_v2', () => ({
  messageServiceV2: v2Mock,
}));
vi.mock('@crush/core/services/match_v2', () => ({
  matchServiceV2: matchV2Mock,
}));
vi.mock('@crush/core/services/match', () => ({
  matchService: legacyMatchMock,
}));
vi.mock('@crush/core/api/callables', () => ({
  callables: callableMock,
}));
vi.mock('@crush/core/firebase/config', () => ({
  getFirebaseDb: () => ({}),
  getFirebaseAuth: () => ({ currentUser: { uid: 'viewer-uid' } }),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: (...args: unknown[]) => firestoreMock.getDoc(...args),
}));

import { messageServiceV2Adapter } from '@crush/core/services/message_v2_adapter';
import { matchServiceV2Adapter } from '@crush/core/services/match_v2_adapter';

describe('messageServiceV2Adapter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getOrCreateConversation synthesizes a conversation keyed by matchId', async () => {
    const convo = await messageServiceV2Adapter.getOrCreateConversation(
      'match-1',
      ['viewer-uid', 'other']
    );
    expect(convo.id).toBe('match-1');
    expect(convo.matchId).toBe('match-1');
    expect(convo.participants).toEqual(['viewer-uid', 'other']);
  });

  it('getConversations maps active matches to conversations', async () => {
    matchV2Mock.getMatches.mockResolvedValue([
      {
        id: 'match-1',
        otherUserId: 'other-1',
        unreadCount: 2,
        createdAt: 'c',
        updatedAt: 'u',
        lastMessageAt: 'l',
      },
    ]);
    const convos = await messageServiceV2Adapter.getConversations('viewer-uid');
    expect(convos).toHaveLength(1);
    expect(convos[0]).toMatchObject({
      id: 'match-1',
      matchId: 'match-1',
      participants: ['viewer-uid', 'other-1'],
      unreadCount: 2,
    });
  });

  it('sendMessage resolves toUserId from the match doc and returns a Message', async () => {
    firestoreMock.getDoc.mockResolvedValue({
      data: () => ({ userIds: ['viewer-uid', 'recipient'] }),
    });
    v2Mock.sendMessage.mockResolvedValue({ messageId: 'm-1' });

    const msg = await messageServiceV2Adapter.sendMessage(
      'match-1',
      'viewer-uid',
      'hi',
      'text'
    );

    expect(v2Mock.sendMessage).toHaveBeenCalledWith('match-1', 'hi', 'text', {
      mediaUrl: undefined,
      toUserId: 'recipient',
    });
    expect(msg).toMatchObject({
      id: 'm-1',
      conversationId: 'match-1',
      senderId: 'viewer-uid',
      status: 'sent',
    });
  });

  it('subscribeToTypingIndicator adapts uid[] to a TypingIndicator', () => {
    let captured: ((ids: string[]) => void) | null = null;
    v2Mock.subscribeToTyping.mockImplementation((_matchId, cb) => {
      captured = cb;
      return () => {};
    });
    const results: (unknown | null)[] = [];
    messageServiceV2Adapter.subscribeToTypingIndicator(
      'match-1',
      'viewer-uid',
      (indicator) => results.push(indicator)
    );
    // Other user typing → indicator; only self typing → null.
    captured!(['other']);
    captured!(['viewer-uid']);
    captured!([]);
    expect(results[0]).toMatchObject({ userId: 'other', isTyping: true });
    expect(results[1]).toBeNull();
    expect(results[2]).toBeNull();
  });

  it('toggleReaction removes when the same emoji exists, adds otherwise', async () => {
    // Existing same emoji → remove
    firestoreMock.getDoc.mockResolvedValueOnce({
      data: () => ({ reactions: { 'viewer-uid': '❤️' } }),
    });
    await messageServiceV2Adapter.toggleReaction(
      'match-1',
      'msg-1',
      'viewer-uid',
      '❤️'
    );
    expect(v2Mock.removeReaction).toHaveBeenCalledWith('match-1', 'msg-1');
    expect(v2Mock.addReaction).not.toHaveBeenCalled();

    vi.clearAllMocks();

    // Different/no emoji → add
    firestoreMock.getDoc.mockResolvedValueOnce({
      data: () => ({ reactions: {} }),
    });
    await messageServiceV2Adapter.toggleReaction(
      'match-1',
      'msg-1',
      'viewer-uid',
      '😂'
    );
    expect(v2Mock.addReaction).toHaveBeenCalledWith('match-1', 'msg-1', '😂');
    expect(v2Mock.removeReaction).not.toHaveBeenCalled();
  });

  it('deleteMessage routes to unsendMessage', async () => {
    v2Mock.unsendMessage.mockResolvedValue(undefined);
    await messageServiceV2Adapter.deleteMessage('match-1', 'msg-1', 'viewer-uid');
    expect(v2Mock.unsendMessage).toHaveBeenCalledWith('match-1', 'msg-1');
  });

  it('setConversationBlocked blocks the other participant via callable', async () => {
    firestoreMock.getDoc.mockResolvedValue({
      data: () => ({ userIds: ['viewer-uid', 'blocked-user'] }),
    });
    callableMock.blockUser.mockResolvedValue({ ok: true });
    await messageServiceV2Adapter.setConversationBlocked(
      'match-1',
      'viewer-uid',
      true
    );
    expect(callableMock.blockUser).toHaveBeenCalledWith({
      targetUserId: 'blocked-user',
    });
  });
});

describe('matchServiceV2Adapter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getMatches delegates to V2 (ignores legacy status arg)', async () => {
    matchV2Mock.getMatches.mockResolvedValue([{ id: 'm-1' }]);
    const matches = await matchServiceV2Adapter.getMatches('viewer-uid', 'mutual');
    expect(matchV2Mock.getMatches).toHaveBeenCalled();
    expect(matches).toEqual([{ id: 'm-1' }]);
  });

  it('getDiscoveryProfiles delegates to legacy (REST-backed) service', async () => {
    legacyMatchMock.getDiscoveryProfiles.mockResolvedValue([{ id: 'p-1' }]);
    const filters = { minAge: 18, maxAge: 50, maxDistance: 50 };
    const profiles = await matchServiceV2Adapter.getDiscoveryProfiles(
      'viewer-uid',
      filters
    );
    expect(legacyMatchMock.getDiscoveryProfiles).toHaveBeenCalledWith(
      'viewer-uid',
      filters,
      undefined
    );
    expect(profiles).toEqual([{ id: 'p-1' }]);
  });

  it('swipe pass → swipeLeft, not a match', async () => {
    matchV2Mock.swipeLeft.mockResolvedValue(undefined);
    const result = await matchServiceV2Adapter.swipe('viewer', 'target', 'pass');
    expect(matchV2Mock.swipeLeft).toHaveBeenCalledWith('target');
    expect(result).toEqual({ isMatch: false });
  });

  it('swipe like → swipeRight, surfaces match', async () => {
    matchV2Mock.swipeRight.mockResolvedValue({
      isMatch: true,
      matchId: 'm-9',
      match: { id: 'm-9' },
    });
    const result = await matchServiceV2Adapter.swipe('viewer', 'target', 'like');
    expect(matchV2Mock.swipeRight).toHaveBeenCalledWith('target');
    expect(result).toEqual({ isMatch: true, matchId: 'm-9' });
  });

  it('unmatch routes to V2', async () => {
    matchV2Mock.unmatch.mockResolvedValue(undefined);
    await matchServiceV2Adapter.unmatch('viewer', 'm-1');
    expect(matchV2Mock.unmatch).toHaveBeenCalledWith('m-1');
  });

  it('togglePinMatch persists via the setMatchPinned callable', async () => {
    matchV2Mock.setPinned.mockResolvedValue(undefined);
    await matchServiceV2Adapter.togglePinMatch('m-1', true);
    expect(matchV2Mock.setPinned).toHaveBeenCalledWith('m-1', true);
  });
});
