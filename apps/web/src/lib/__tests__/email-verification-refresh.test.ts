import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as Record<string, unknown> | null },
  syncEmailVerification: vi.fn(),
}));

vi.mock('@crush/core/firebase/config', () => ({
  getFirebaseAuth: () => mocks.auth,
}));

vi.mock('@crush/core/api/callables', () => ({
  callables: { syncEmailVerification: mocks.syncEmailVerification },
}));

import { authService } from '@crush/core/services/auth';

function firebaseUser(uid: string, emailVerified: boolean) {
  return {
    uid,
    email: 'ace@example.com',
    emailVerified,
    reload: vi.fn(),
    getIdToken: vi.fn().mockResolvedValue('fresh-token'),
  };
}

describe('central email verification refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.syncEmailVerification.mockResolvedValue({ ok: true });
  });

  it('reloads, re-reads currentUser, force-refreshes the token, and syncs the trusted mirror', async () => {
    const stale = firebaseUser('uid-1', false);
    const fresh = firebaseUser('uid-1', true);
    stale.reload.mockImplementation(async () => {
      mocks.auth.currentUser = fresh;
    });
    mocks.auth.currentUser = stale;

    await expect(authService.refreshAndCheckEmailVerification()).resolves.toBe(true);
    expect(stale.reload).toHaveBeenCalledTimes(1);
    expect(fresh.getIdToken).toHaveBeenCalledWith(true);
    expect(mocks.syncEmailVerification).toHaveBeenCalledWith({});
  });

  it('preserves Firebase true when the convenience Firestore mirror cannot sync', async () => {
    const user = firebaseUser('uid-1', true);
    mocks.auth.currentUser = user;
    mocks.syncEmailVerification.mockRejectedValue(new Error('offline'));
    await expect(authService.refreshAndCheckEmailVerification()).resolves.toBe(true);
  });

  it('rejects a result if the signed-in Firebase UID changed during reload', async () => {
    const stale = firebaseUser('uid-1', false);
    stale.reload.mockImplementation(async () => {
      mocks.auth.currentUser = firebaseUser('uid-2', true);
    });
    mocks.auth.currentUser = stale;
    await expect(authService.refreshAndCheckEmailVerification()).resolves.toBe(false);
    expect(mocks.syncEmailVerification).not.toHaveBeenCalled();
  });
});
