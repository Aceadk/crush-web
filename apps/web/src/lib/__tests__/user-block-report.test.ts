/**
 * Tests for userService block/unblock/report canonicalization (P0.3 / WEB-DATA-001).
 *
 * Verifies these route through the backend callables (canonical shapes) instead
 * of the rejected direct Firestore paths (users/{uid}/blocked, wrong reports
 * shape, illegal matches mutation).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { callableMock } = vi.hoisted(() => ({
  callableMock: {
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
    reportUser: vi.fn(),
    getBlockedUsers: vi.fn(),
  },
}));

vi.mock('@crush/core/api/callables', () => ({ callables: callableMock }));
vi.mock('@crush/core/firebase/config', () => ({ getFirebaseDb: () => ({}) }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
  Timestamp: class {},
}));

import { userService } from '@crush/core/services/user';

describe('userService — block/unblock/report via canonical callables', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blockUser calls blockUser callable with blockedId (not targetUserId)', async () => {
    callableMock.blockUser.mockResolvedValue({ ok: true });
    await userService.blockUser('viewer', 'bad-actor');
    expect(callableMock.blockUser).toHaveBeenCalledWith({ blockedId: 'bad-actor' });
  });

  it('unblockUser calls unblockUser callable with blockedId', async () => {
    callableMock.unblockUser.mockResolvedValue({ ok: true });
    await userService.unblockUser('viewer', 'bad-actor');
    expect(callableMock.unblockUser).toHaveBeenCalledWith({ blockedId: 'bad-actor' });
  });

  it('reportUser uses the canonical reports shape (reportedId/reason/description)', async () => {
    callableMock.reportUser.mockResolvedValue({ ok: true });
    await userService.reportUser('viewer', 'bad-actor', 'harassment', 'said mean things');
    expect(callableMock.reportUser).toHaveBeenCalledWith({
      reportedId: 'bad-actor',
      reason: 'harassment',
      description: 'said mean things',
      source: 'web',
    });
  });

  it('getBlockedUsers maps the backend list', async () => {
    callableMock.getBlockedUsers.mockResolvedValue({
      ok: true,
      blocked: [
        { id: 'u1', name: 'Blocked One', photoUrl: 'p1.jpg', blockedAt: '2026-01-01T00:00:00.000Z' },
        { id: 'u2', name: null, photoUrl: null, blockedAt: null },
      ],
    });
    const result = await userService.getBlockedUsers('viewer');
    expect(result[0]).toMatchObject({ id: 'u1', name: 'Blocked One', photoUrl: 'p1.jpg' });
    expect(result[0].blockedAt).toBeInstanceOf(Date);
    // null name falls back to a placeholder.
    expect(result[1].name).toBe('Unknown User');
    expect(result[1].photoUrl).toBeUndefined();
  });

  it('isUserBlocked derives from the backend blocked list', async () => {
    callableMock.getBlockedUsers.mockResolvedValue({
      ok: true,
      blocked: [{ id: 'bad-actor', name: 'X', photoUrl: null, blockedAt: null }],
    });
    expect(await userService.isUserBlocked('viewer', 'bad-actor')).toBe(true);
    expect(await userService.isUserBlocked('viewer', 'someone-else')).toBe(false);
  });
});
