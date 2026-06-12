/**
 * Boost server-ownership test (Phase 4 Step 6/7).
 *
 * Verifies boost activation routes through the backend activateBoost callable
 * (which owns the Plus check + cooldown and writes the rules-protected boost.*
 * fields) instead of a direct client write the rules now reject.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { callableMock } = vi.hoisted(() => ({
  callableMock: { activateBoost: vi.fn() },
}));

vi.mock('@crush/core/api/callables', () => ({ callables: callableMock }));
vi.mock('@crush/core/firebase/config', () => ({ getFirebaseDb: () => ({}) }));
vi.mock('firebase/firestore', () => ({
  Timestamp: class {},
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

import { boostService } from '@crush/core/services/boost';

describe('boostService.activateBoost — server-owned', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the activateBoost callable and maps the status', async () => {
    callableMock.activateBoost.mockResolvedValue({
      ok: true,
      isActive: true,
      activeUntil: '2026-06-07T00:30:00.000Z',
      cooldownUntil: '2026-07-07T00:00:00.000Z',
      lastActivatedAt: '2026-06-07T00:00:00.000Z',
      durationMinutes: 30,
      cooldownHours: 720,
    });

    const status = await boostService.activateBoost('viewer');

    expect(callableMock.activateBoost).toHaveBeenCalledTimes(1);
    expect(status).toMatchObject({
      canBoost: false,
      isActive: true,
      activeUntil: '2026-06-07T00:30:00.000Z',
      durationMinutes: 30,
      cooldownHours: 720,
    });
  });

  it('propagates backend errors (e.g. cooldown / not premium)', async () => {
    callableMock.activateBoost.mockRejectedValue(new Error('Boost is on cooldown.'));
    await expect(boostService.activateBoost('viewer')).rejects.toThrow(/cooldown/i);
  });
});
