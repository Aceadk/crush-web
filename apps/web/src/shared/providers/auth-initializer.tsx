'use client';

import { monitoring } from '@/lib/sentry';
import {
    initializeWebAppCheck,
    useAuthStore,
    useMatchStore,
    useMessageStore,
    useUIStore,
    type Conversation,
    type Match,
    type Message,
    type UserProfile,
} from '@crush/core';
import { useEffect, useState, type ReactNode } from 'react';

type E2EScenario = 'onboarding' | 'discovery' | 'chat';

interface E2EAuthPayload {
  scenario?: E2EScenario;
  user?: {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    displayName?: string;
    phoneNumber?: string;
    photoURL?: string;
    getIdToken?: (forceRefresh?: boolean) => Promise<string>;
    reload?: () => Promise<void>;
  };
  profile?: Partial<UserProfile>;
}

declare global {
  interface Window {
    __CRUSH_E2E_AUTH_STATE__?: E2EAuthPayload;
  }
}

const E2E_MATCH_ID = 'e2e-match-1';
const E2E_USER_ID = 'e2e-user-1';
const E2E_OTHER_USER_ID = 'e2e-other-user-1';
const E2E_OTHER_USER_NAME = 'Taylor QA';
const E2E_AVATAR_URL = 'https://lh3.googleusercontent.com/a/default-user=s256-c';
const TOKEN_SYNC_INTERVAL_MS = 45 * 60 * 1000; // 45 min
const ACTIVITY_SYNC_THROTTLE_MS = 45 * 1000; // avoid hammering activity endpoint
const SESSION_IDLE_TIMEOUT_MS =
  Math.max(60, Number(process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_SECONDS || 1800)) * 1000;
const SESSION_IDLE_WARNING_MS =
  Math.max(30, Number(process.env.NEXT_PUBLIC_SESSION_IDLE_WARNING_SECONDS || 120)) * 1000;

function seedMatchStoreForE2E(scenario: E2EScenario) {
  const now = new Date().toISOString();

  const mockMatch: Match = {
    id: E2E_MATCH_ID,
    userId: E2E_USER_ID,
    otherUserId: E2E_OTHER_USER_ID,
    status: 'mutual',
    preMatchMessageRequestsCount: 0,
    pinnedForUser: false,
    otherUserName: E2E_OTHER_USER_NAME,
    otherUserPhotoUrl: E2E_AVATAR_URL,
    createdAt: now,
    updatedAt: now,
    unreadCount: 1,
    lastMessageAt: now,
    lastMessage: 'Hey, ready for coffee this week?',
  };

  const discoveryProfile = {
    id: E2E_OTHER_USER_ID,
    displayName: E2E_OTHER_USER_NAME,
    age: 29,
    bio: 'QA-powered profile used for deterministic end-to-end flow validation.',
    photos: [E2E_AVATAR_URL],
    distance: 4,
    interests: ['Coffee', 'Hiking', 'Music'],
    isVerified: true,
  };

  const current = useMatchStore.getState();

  useMatchStore.setState({
    ...current,
    matches: [mockMatch],
    discoveryProfiles: scenario === 'onboarding' ? [] : [discoveryProfile],
    currentProfileIndex: 0,
    loading: false,
    error: null,
    subscribeToMatches: () => {},
    cleanup: () => {},
    loadMatches: async () => {},
    loadDiscoveryProfiles: async () => {},
    swipe: async () => ({ isMatch: true, matchId: E2E_MATCH_ID }),
  });
}

function seedMessageStoreForE2E(scenario: E2EScenario) {
  const now = new Date().toISOString();

  const conversation: Conversation = {
    id: 'e2e-conversation-1',
    matchId: E2E_MATCH_ID,
    participants: [E2E_USER_ID, E2E_OTHER_USER_ID],
    unreadCount: 1,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    isBlocked: false,
    lastMessage: {
      id: 'e2e-message-latest',
      conversationId: 'e2e-conversation-1',
      senderId: E2E_OTHER_USER_ID,
      content: 'Hey, ready for coffee this week?',
      type: 'text',
      status: 'read',
      timestamp: now,
    },
  };

  const seededMessages: Message[] = [
    {
      id: 'e2e-message-1',
      conversationId: conversation.id,
      senderId: E2E_OTHER_USER_ID,
      content: 'Hey! Nice to match with you.',
      type: 'text',
      status: 'read',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: 'e2e-message-2',
      conversationId: conversation.id,
      senderId: E2E_USER_ID,
      content: 'Likewise, great to connect.',
      type: 'text',
      status: 'read',
      timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    },
    {
      id: 'e2e-message-3',
      conversationId: conversation.id,
      senderId: E2E_OTHER_USER_ID,
      content: 'Want to plan something this weekend?',
      type: 'text',
      status: 'read',
      timestamp: new Date(Date.now() - 1000 * 60).toISOString(),
    },
  ];

  const current = useMessageStore.getState();

  useMessageStore.setState({
    ...current,
    loading: false,
    loadingMore: false,
    hasMore: false,
    error: null,
    conversations: scenario === 'onboarding' ? [] : [conversation],
    currentConversation: scenario === 'chat' ? conversation : null,
    messages: scenario === 'chat' ? seededMessages : [],
    loadConversations: async () => {},
    loadMessages: async () => {},
    loadMoreMessages: async () => {},
    openConversation: async () => {
      useMessageStore.setState({
        currentConversation: conversation,
        messages: seededMessages,
        loading: false,
        error: null,
      });
    },
    sendMessage: async (content, currentUserId) => {
      const state = useMessageStore.getState();
      const nextMessage: Message = {
        id: `e2e-message-${Date.now()}`,
        conversationId: conversation.id,
        senderId: currentUserId,
        content,
        type: 'text',
        status: 'read',
        timestamp: new Date().toISOString(),
      };
      useMessageStore.setState({
        messages: [...state.messages, nextMessage],
        conversations: state.conversations.map((item) =>
          item.id === conversation.id
            ? {
                ...item,
                lastMessage: nextMessage,
                lastMessageAt: nextMessage.timestamp,
                updatedAt: nextMessage.timestamp,
              }
            : item
        ),
      });
    },
    markAsRead: async () => {},
    setTyping: async () => {},
    toggleReaction: async () => {},
    editMessage: async () => {},
    deleteMessage: async () => {},
    blockConversation: async () => {
      const state = useMessageStore.getState();
      if (!state.currentConversation) return;
      useMessageStore.setState({
        currentConversation: {
          ...state.currentConversation,
          isBlocked: true,
          blockedBy: E2E_USER_ID,
        },
      });
    },
    closeConversation: () => {},
    cleanup: () => {},
  });
}

interface AuthInitializerProps {
  children: ReactNode;
}

/**
 * Global auth initializer component that sets up the Firebase auth state listener.
 * This must be rendered at the app root level to ensure auth state is tracked
 * across all pages, including auth pages (login, signup).
 */
export function AuthInitializer({ children }: AuthInitializerProps) {
  const initialize = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const signOut = useAuthStore((state) => state.signOut);
  const addToast = useUIStore((state) => state.addToast);
  const [usingE2EBypass, setUsingE2EBypass] = useState(false);

  useEffect(() => {
    monitoring.init();
    // Initialize App Check before any protected backend call so attestation
    // tokens attach to callable/REST/Firestore requests. No-op when unconfigured
    // or outside the browser. See packages/core/src/firebase/config.ts.
    try {
      initializeWebAppCheck();
    } catch {
      // App Check init is best-effort at bootstrap; failures are logged inside.
    }
  }, []);

  useEffect(() => {
    if (!user) {
      monitoring.setUser(null);
      return;
    }

    monitoring.setUser({
      id: user.uid,
      email: user.email || undefined,
      isPremium: Boolean(profile?.isPremium),
    });
  }, [user, profile?.isPremium]);

  useEffect(() => {
    const e2eBypassEnabled = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === '1';

    if (e2eBypassEnabled && typeof window !== 'undefined') {
      const payload = window.__CRUSH_E2E_AUTH_STATE__;
      if (payload?.user?.uid) {
        const now = new Date().toISOString();

        const baseProfile: UserProfile = {
          id: payload.user.uid,
          email: payload.user.email,
          phoneNumber: payload.user.phoneNumber,
          displayName: payload.user.displayName || 'E2E Tester',
          bio: 'Deterministic E2E profile',
          photos: [E2E_AVATAR_URL],
          profilePhotoUrl: E2E_AVATAR_URL,
          interests: ['Coffee', 'Travel', 'Music'],
          isVerified: true,
          subscriptionTier: 'free',
          createdAt: now,
          updatedAt: now,
          hasAcceptedTerms: true,
          onboardingComplete: true,
          profileComplete: true,
          isEmailVerified: payload.user.emailVerified ?? true,
          isPhoneVerified: Boolean(payload.user.phoneNumber),
        };

        const scenario = payload.scenario ?? 'discovery';
        const profile = {
          ...baseProfile,
          ...payload.profile,
          id: payload.user.uid,
        };

        useAuthStore.setState({
          user: payload.user as ReturnType<typeof useAuthStore.getState>['user'],
          profile,
          loading: false,
          error: null,
          initialized: true,
        });

        seedMatchStoreForE2E(scenario);
        seedMessageStoreForE2E(scenario);
        setUsingE2EBypass(true);
        return;
      }
    }

    // Initialize auth listener on mount with error handling
    try {
      initialize();
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }, [initialize]);

  useEffect(() => {
    if (usingE2EBypass) {
      return;
    }

    if (!user) {
      return;
    }

    let sessionInFlight = false;
    let activityInFlight = false;
    let timedOut = false;
    let warningShown = false;
    let lastActivityAt = Date.now();
    let lastActivitySyncAt = 0;

    const syncSession = async (forceRefresh: boolean) => {
      if (sessionInFlight || timedOut) {
        return;
      }
      sessionInFlight = true;
      try {
        await refreshSession({ forceRefresh });
      } catch (error) {
        console.error('Failed to refresh session token:', error);
      } finally {
        sessionInFlight = false;
      }
    };

    const syncActivity = async (force: boolean) => {
      if (timedOut || activityInFlight) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastActivitySyncAt < ACTIVITY_SYNC_THROTTLE_MS) {
        return;
      }

      activityInFlight = true;
      try {
        const res = await fetch('/api/auth/activity', { method: 'POST' });
        if (res.status === 401) {
          timedOut = true;
          return;
        }
        if (res.ok) {
          lastActivitySyncAt = now;
        }
      } catch (error) {
        console.error('Failed to sync auth activity:', error);
      } finally {
        activityInFlight = false;
      }
    };

    const markActivity = () => {
      if (timedOut) {
        return;
      }
      lastActivityAt = Date.now();
      warningShown = false;
      void syncActivity(false);
    };

    // Ensure cookie + last-active are synced at session start.
    void syncSession(false);
    void syncActivity(true);

    const tokenIntervalId = window.setInterval(() => {
      // Force refresh periodically to rotate token in active sessions.
      void syncSession(true);
    }, TOKEN_SYNC_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        markActivity();
        void syncSession(true);
      }
    };

    const handleOnline = () => {
      markActivity();
      void syncSession(true);
    };

    const idleIntervalId = window.setInterval(() => {
      if (timedOut) {
        return;
      }

      const idleMs = Date.now() - lastActivityAt;
      const warningThresholdMs = Math.max(0, SESSION_IDLE_TIMEOUT_MS - SESSION_IDLE_WARNING_MS);

      if (!warningShown && idleMs >= warningThresholdMs && idleMs < SESSION_IDLE_TIMEOUT_MS) {
        warningShown = true;
        addToast({
          type: 'info',
          title: 'Session expiring soon',
          description: 'You will be signed out soon due to inactivity.',
          duration: 5000,
        });
      }

      if (idleMs >= SESSION_IDLE_TIMEOUT_MS) {
        timedOut = true;
        addToast({
          type: 'info',
          title: 'Session expired',
          description: 'Signed out due to inactivity. Please sign in again.',
          duration: 5000,
        });

        void (async () => {
          try {
            await signOut();
          } catch (error) {
            console.error('Failed to sign out after inactivity timeout:', error);
          } finally {
            window.location.assign('/auth/login?reason=timeout');
          }
        })();
      }
    }, 10_000);

    window.addEventListener('mousemove', markActivity, { passive: true });
    window.addEventListener('mousedown', markActivity, { passive: true });
    window.addEventListener('keydown', markActivity);
    window.addEventListener('touchstart', markActivity, { passive: true });
    window.addEventListener('scroll', markActivity, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(tokenIntervalId);
      window.clearInterval(idleIntervalId);
      window.removeEventListener('mousemove', markActivity);
      window.removeEventListener('mousedown', markActivity);
      window.removeEventListener('keydown', markActivity);
      window.removeEventListener('touchstart', markActivity);
      window.removeEventListener('scroll', markActivity);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [user, refreshSession, signOut, addToast, usingE2EBypass]);

  // Always render children - don't block rendering
  return <>{children}</>;
}
