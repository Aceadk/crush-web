/**
 * Analytics Service
 * Lightweight analytics wrapper that can be connected to various providers
 * (Google Analytics, Mixpanel, Amplitude, PostHog, etc.)
 */

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export type FunnelName = 'auth' | 'onboarding' | 'subscription' | 'messaging';
export type FunnelStepStatus = 'started' | 'completed' | 'failed' | 'abandoned';

// Event types for type safety
export type AnalyticsEvent =
  // Authentication
  | { name: 'sign_up'; properties: { method: string } }
  | { name: 'login'; properties: { method: string } }
  | { name: 'logout'; properties?: Record<string, never> }

  // Profile
  | { name: 'profile_complete'; properties: { completeness: number } }
  | { name: 'profile_photo_added'; properties: { photoCount: number } }
  | { name: 'profile_photo_removed'; properties: { photoCount: number } }
  | { name: 'profile_updated'; properties: { fields: string[] } }

  // Discovery
  | { name: 'profile_viewed'; properties: { profileId: string } }
  | { name: 'swipe_right'; properties: { targetUserId: string } }
  | { name: 'swipe_left'; properties: { targetUserId: string } }
  | { name: 'super_like'; properties: { targetUserId: string } }
  | { name: 'rewind'; properties: { targetUserId: string } }
  | { name: 'daily_limit_reached'; properties: { likesUsed: number } }

  // Matching
  | { name: 'match_created'; properties: { matchId: string } }
  | { name: 'match_viewed'; properties: { matchId: string } }
  | { name: 'conversation_started'; properties: { matchId: string } }

  // Messaging
  | { name: 'message_sent'; properties: { matchId: string; messageType: string } }
  | { name: 'ice_breaker_used'; properties: { category: string } }
  | { name: 'conversation_pinned'; properties: { matchId: string } }
  | { name: 'conversation_unpinned'; properties: { matchId: string } }

  // Premium
  | { name: 'paywall_viewed'; properties: { source: string } }
  | { name: 'checkout_started'; properties: { tier: string; price: number; currency: string } }
  | {
      name: 'subscription_purchased';
      properties: { tier: string; price: number; currency: string };
    }
  | { name: 'subscription_cancelled'; properties: { tier: string; reason?: string } }
  | { name: 'premium_feature_used'; properties: { feature: string } }
  | { name: 'premium_feature_blocked'; properties: { feature: string } }
  | { name: 'boost_used'; properties?: Record<string, never> }

  // Streaks
  | { name: 'streak_started'; properties: { days: number } }
  | { name: 'streak_continued'; properties: { days: number } }
  | { name: 'streak_broken'; properties: { previousStreak: number } }
  | { name: 'streak_milestone'; properties: { days: number; bonusLikes: number } }

  // Safety
  | { name: 'user_reported'; properties: { reason: string } }
  | { name: 'user_blocked'; properties: { targetUserId: string } }
  | { name: 'safety_center_viewed'; properties?: Record<string, never> }

  // General
  | { name: 'page_view'; properties: { path: string; title?: string } }
  | { name: 'error'; properties: { message: string; stack?: string } }
  | { name: 'feature_used'; properties: { feature: string } }
  | {
      name: 'funnel_step';
      properties: {
        funnel: FunnelName;
        step: string;
        status: FunnelStepStatus;
        method?: string;
        tier?: string;
        reason?: string;
        value?: number;
      };
    };

// User properties for identification
export interface UserProperties {
  userId?: string;
  email?: string;
  isPremium?: boolean;
  subscriptionTier?: string;
  billingPeriod?: string;
  profileComplete?: boolean;
  signupDate?: string;
  age?: number;
  gender?: string;
}

class Analytics {
  private initialized = false;
  private userId: string | null = null;
  private userProperties: UserProperties = {};
  private debugMode = process.env.NODE_ENV === 'development';

  /**
   * Initialize analytics
   * Call this once when the app starts
   */
  init() {
    if (this.initialized) return;

    // Initialize any analytics providers here
    // Example: Google Analytics
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GA_ID) {
      // GA4 initialization would go here
      this.log('Analytics initialized with GA4');
    }

    // Example: PostHog
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      // PostHog initialization would go here
      this.log('Analytics initialized with PostHog');
    }

    this.initialized = true;
  }

  private emitEvent(eventName: string, properties: Record<string, unknown>) {
    if (typeof window === 'undefined') {
      return;
    }

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, properties);
      return;
    }

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...properties });
    }
  }

  /**
   * Identify a user
   */
  identify(userId: string, properties?: UserProperties) {
    this.userId = userId;
    this.userProperties = { ...this.userProperties, ...properties };

    this.log('User identified:', userId, properties);

    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('set', 'user_id', userId);
      window.gtag('set', 'user_properties', properties ?? {});
    }
  }

  /**
   * Track an event
   */
  track<T extends AnalyticsEvent>(event: T) {
    if (!this.initialized && typeof window !== 'undefined') {
      this.init();
    }

    const properties = (event.properties ?? {}) as Record<string, unknown>;

    const eventData = {
      ...event,
      properties: {
        ...properties,
        userId: this.userId,
        timestamp: new Date().toISOString(),
      },
    };

    this.log('Event tracked:', eventData);

    this.emitEvent(event.name, eventData.properties as Record<string, unknown>);
  }

  /**
   * Track page view
   */
  pageView(path: string, title?: string) {
    this.track({
      name: 'page_view',
      properties: { path, title },
    });
  }

  /**
   * Track error
   */
  error(message: string, stack?: string) {
    this.track({
      name: 'error',
      properties: { message, stack },
    });

    // Also log to console in development
    if (this.debugMode) {
      console.error('Analytics error:', message, stack);
    }
  }

  /**
   * Reset user (on logout)
   */
  reset() {
    this.userId = null;
    this.userProperties = {};
    this.log('Analytics reset');

    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('set', 'user_id', null);
      window.gtag('set', 'user_properties', {});
    }
  }

  /**
   * Set super properties (properties sent with every event)
   */
  setSuperProperties(properties: Record<string, unknown>) {
    this.userProperties = { ...this.userProperties, ...properties };
    this.log('Super properties set:', properties);
  }

  /**
   * Debug logging
   */
  private log(...args: unknown[]) {
    if (this.debugMode) {
      // Intentional debug output, opt-in via debugMode only.
      // eslint-disable-next-line no-console
      console.log('[Analytics]', ...args);
    }
  }

  /**
   * Funnel step tracking helper to standardize conversion events.
   */
  funnelStep(
    funnel: FunnelName,
    step: string,
    status: FunnelStepStatus,
    extras?: { method?: string; tier?: string; reason?: string; value?: number }
  ) {
    this.track({
      name: 'funnel_step',
      properties: {
        funnel,
        step,
        status,
        method: extras?.method,
        tier: extras?.tier,
        reason: extras?.reason,
        value: extras?.value,
      },
    });
  }
}

// Singleton instance
export const analytics = new Analytics();

// React hook for easy usage
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    identify: analytics.identify.bind(analytics),
    pageView: analytics.pageView.bind(analytics),
    funnelStep: analytics.funnelStep.bind(analytics),
    reset: analytics.reset.bind(analytics),
  };
}
