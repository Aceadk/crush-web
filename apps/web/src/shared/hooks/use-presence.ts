'use client';

import { useEffect, useState } from 'react';
import { presenceService, PRESENCE_HEARTBEAT_MS, useAuthStore } from '@crush/core';

/**
 * Write the current user's presence heartbeat while the session is active, so
 * their matches (mobile and web) see them online. Mirrors the mobile app:
 * `presence/{uid}` is refreshed every ~45s while the tab is visible, set
 * offline when hidden/closed. The privacy gate is applied by READERS (see
 * usePeerPresence), so the writer always writes — consistent with mobile.
 */
export function usePresenceHeartbeat(): void {
  const { user } = useAuthStore();
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;

    let disposed = false;
    const write = (online: boolean) => {
      if (disposed) return;
      // Best-effort: a failed presence write must never surface to the user.
      void presenceService.setPresence(uid, online).catch(() => {});
    };

    write(document.visibilityState !== 'hidden');
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') write(true);
    }, PRESENCE_HEARTBEAT_MS);

    const onVisibility = () => write(document.visibilityState !== 'hidden');
    // pagehide fires on tab close / navigation away more reliably than
    // beforeunload on mobile browsers.
    const onLeave = () => write(false);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onLeave);

    return () => {
      disposed = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onLeave);
      write(false);
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
