import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiscoveryFilters, DiscoveryProfile } from '@crush/core/types/match';

const { matchServiceMock } = vi.hoisted(() => ({
  matchServiceMock: {
    getDiscoveryProfiles: vi.fn(),
    getMatches: vi.fn(),
    subscribeToMatches: vi.fn(),
    swipe: vi.fn(),
    unmatch: vi.fn(),
    togglePinMatch: vi.fn(),
    clearConversation: vi.fn(),
  },
}));

vi.mock('@crush/core/services/match_v2_adapter', () => ({
  matchServiceV2Adapter: matchServiceMock,
}));
vi.mock('@crush/core/services/match', () => ({
  matchService: matchServiceMock,
}));

import { useMatchStore } from '@crush/core/stores/match';

const savedFilters: DiscoveryFilters = {
  minAge: 24,
  maxAge: 36,
  maxDistance: 25,
  genders: ['female'],
};

function profile(id: string): DiscoveryProfile {
  return {
    id,
    displayName: id,
    photos: [`https://img.example.com/${id}.jpg`],
    isVerified: false,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('web Discovery request lifecycle parity', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    useMatchStore.getState().cleanup();
    useMatchStore.setState({ filters: savedFilters });
  });

  it('coalesces the same account/filter request', async () => {
    const request = deferred<DiscoveryProfile[]>();
    matchServiceMock.getDiscoveryProfiles.mockReturnValue(request.promise);

    const first = useMatchStore.getState().loadDiscoveryProfiles('viewer');
    const second = useMatchStore.getState().loadDiscoveryProfiles('viewer');

    expect(matchServiceMock.getDiscoveryProfiles).toHaveBeenCalledTimes(1);
    request.resolve([profile('candidate')]);
    await Promise.all([first, second]);

    expect(useMatchStore.getState().discoveryProfiles.map((item) => item.id)).toEqual([
      'candidate',
    ]);
  });

  it('replaces optional filters so one account cannot inherit another account’s gender rule', () => {
    useMatchStore.getState().setFilters(savedFilters);
    useMatchStore.getState().setFilters({ minAge: 18, maxAge: 50, maxDistance: 50 });

    expect(useMatchStore.getState().filters).toEqual({
      minAge: 18,
      maxAge: 50,
      maxDistance: 50,
    });
  });

  it('clears the previous owner immediately and ignores their late response', async () => {
    const oldRequest = deferred<DiscoveryProfile[]>();
    const newRequest = deferred<DiscoveryProfile[]>();
    matchServiceMock.getDiscoveryProfiles.mockImplementation((userId: string) =>
      userId === 'old-user' ? oldRequest.promise : newRequest.promise
    );

    useMatchStore.setState({
      discoveryOwnerUserId: 'old-user',
      discoveryProfiles: [profile('old-card')],
    });
    const oldLoad = useMatchStore.getState().loadDiscoveryProfiles('old-user');
    const newLoad = useMatchStore.getState().loadDiscoveryProfiles('new-user');

    expect(useMatchStore.getState().discoveryOwnerUserId).toBe('new-user');
    expect(useMatchStore.getState().discoveryProfiles).toEqual([]);

    newRequest.resolve([profile('new-card')]);
    await newLoad;
    oldRequest.resolve([profile('late-old-card')]);
    await oldLoad;

    expect(useMatchStore.getState().discoveryProfiles.map((item) => item.id)).toEqual([
      'new-card',
    ]);
  });

  it('retries transient failures silently and publishes only the success', async () => {
    vi.useFakeTimers();
    matchServiceMock.getDiscoveryProfiles
      .mockRejectedValueOnce(new Error('temporary-1'))
      .mockRejectedValueOnce(new Error('temporary-2'))
      .mockResolvedValueOnce([profile('recovered')]);

    const load = useMatchStore.getState().loadDiscoveryProfiles('viewer');
    await vi.runAllTimersAsync();
    await load;

    expect(matchServiceMock.getDiscoveryProfiles).toHaveBeenCalledTimes(3);
    expect(useMatchStore.getState().discoveryError).toBeNull();
    expect(useMatchStore.getState().discoveryProfiles[0]?.id).toBe('recovered');
  });

  it('uses the same one-time 500 km empty-deck expansion as mobile', async () => {
    matchServiceMock.getDiscoveryProfiles
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([profile('extended-card')]);

    await useMatchStore.getState().loadDiscoveryProfiles('viewer');

    expect(matchServiceMock.getDiscoveryProfiles).toHaveBeenNthCalledWith(
      1,
      'viewer',
      savedFilters
    );
    expect(matchServiceMock.getDiscoveryProfiles).toHaveBeenNthCalledWith(2, 'viewer', {
      ...savedFilters,
      maxDistance: 500,
    });
    expect(useMatchStore.getState().localDeckExpanded).toBe(true);
    expect(useMatchStore.getState().discoveryProfiles[0]?.id).toBe('extended-card');
  });
});
