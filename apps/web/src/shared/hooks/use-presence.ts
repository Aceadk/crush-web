'use client';

import { useEffect, useState } from 'react';
import { presenceService, PRESENCE_HEARTBEAT_MS, useAuthStore } from '@crush/core';

/**
 * Write the current user's presence heartbeat while the session is active, so
 * their matches (mobile and web) see them online. Mirrors the mobile app:
 * `presence/{uid}` is refreshed every ~45s while the tab is visible. Hidden or
 * closed clients stop heartbeating and decay after the shared two-minute
 * freshness window. We deliberately do not write `false`: that would let one
 * closed tab/device overwrite another app or web client that is still active.
 */
export function usePresenceHeartbeat(): void {
  const { user } = useAuthStore();
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;

    let disposed = false;
    const writeHeartbeat = () => {
      if (disposed) return;
      // Best-effort: a failed presence write must never surface to the user.
      void presenceService.setPresence(uid, true).catch(() => {});
    };

    if (document.visibilityState !== 'hidden') writeHeartbeat();
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') writeHeartbeat();
    }, PRESENCE_HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') writeHeartbeat();
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [uid]);
}

/**
 * Subscribe to a peer's online state (freshness- and privacy-gated). Returns
 * false until confirmed online. Reading a peer's presence requires premium
 * (Firestore rules); a denied read resolves to offline.
 */
export function usePeerPresence(peerId: string | undefined | null): boolean {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!peerId) {
      setOnline(false);
      return;
    }
    const unsub = presenceService.subscribeToPresence(peerId, setOnline);
    return () => {
      unsub();
      setOnline(false);
    };
  }, [peerId]);

  return online;
}
