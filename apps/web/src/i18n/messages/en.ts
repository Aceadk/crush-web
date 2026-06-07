/**
 * English message catalog — the source of truth for the i18n key set.
 *
 * Other locales' catalogs must satisfy `Messages` (= typeof this object), so
 * TypeScript enforces that translations are structurally complete.
 *
 * Keys are grouped by namespace. Use `{placeholder}` for interpolation, matching
 * the mobile ARB convention. For pluralization, provide `_one` / `_other`
 * variants and resolve via `tPlural` (see translate.ts).
 *
 * This is a SEED set covering common/nav/auth/chat/discovery/settings — enough
 * to establish the structure. Externalizing the rest of the app's strings into
 * these namespaces is the incremental follow-up.
 */

export const en = {
  common: {
    appName: 'Crush',
    tagline: 'Find Your Perfect Match',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    skip: 'Skip',
    done: 'Done',
    retry: 'Retry',
    loading: 'Loading…',
    search: 'Search',
    seeAll: 'See all',
    edit: 'Edit',
    close: 'Close',
    somethingWentWrong: 'Something went wrong. Please try again.',
  },
  nav: {
    discover: 'Discover',
    matches: 'Matches',
    messages: 'Messages',
    likes: 'Likes',
    profile: 'Profile',
    settings: 'Settings',
    premium: 'Premium',
  },
  auth: {
    signIn: 'Sign in',
    signUp: 'Sign up',
    signOut: 'Sign out',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    or: 'or',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    verifyEmail: 'Verify your email',
    resendCode: 'Resend code',
    welcomeBack: 'Welcome back',
    signInSubtitle: 'Sign in to continue to Crush',
    continueWithPhone: 'Continue with Phone',
    orContinueWithEmail: 'Or continue with email',
    emailPlaceholder: 'Email address',
    fillAllFields: 'Please fill in all fields.',
    sessionExpired: 'Your session expired due to inactivity. Please sign in again.',
    deviceVerifyNeeded:
      'Please verify this new device from your email link before continuing.',
    enterEmailFirst: 'Enter your email address first to receive a sign-in link.',
    emailLinkSent: 'Sign-in link sent to {email}. Check your inbox.',
    rememberMe: 'Remember me for 30 days',
    signingIn: 'Signing in…',
    emailMeLink: 'Email me a sign-in link',
  },
  discovery: {
    title: 'Discover',
    like: 'Like',
    pass: 'Pass',
    superLike: 'Super Like',
    boost: 'Boost',
    noMoreProfiles: "You've seen everyone for now",
    distanceAway: '{distance} km away',
    matchTitle: "It's a match!",
    matchBody: 'You and {name} liked each other.',
    keepSwiping: 'Keep swiping',
    sendMessage: 'Send a message',
  },
  chat: {
    title: 'Messages',
    messagePlaceholder: 'Type a message…',
    send: 'Send',
    typing: 'typing…',
    messageRequests: 'Message requests',
    emptyTitle: 'No messages yet',
    emptyBody: 'Match with someone to start chatting.',
    unmatch: 'Unmatch',
    report: 'Report',
    block: 'Block',
    you: 'You',
    deletedMessage: 'This message was deleted',
  },
  settings: {
    title: 'Settings',
    account: 'Account',
    privacy: 'Privacy',
    notifications: 'Notifications',
    blockedUsers: 'Blocked users',
    discovery: 'Discovery',
    incognito: 'Incognito',
    helpSupport: 'Help & support',
    deleteAccount: 'Delete account',
    manageSubscription: 'Manage subscription',
    language: 'Language',
    theme: 'Theme',
  },
  subscription: {
    upgradeTitle: 'Upgrade to Crush Plus',
    free: 'Free',
    plus: 'Plus',
    currentPlan: 'Current plan',
    renewsOn: 'Renews on {date}',
    expiresOn: 'Expires on {date}',
    getPremium: 'Get Premium',
  },
  errors: {
    network: 'Network error. Check your connection and try again.',
    notFound: 'The requested item could not be found.',
    unauthorized: 'Please sign in to continue.',
    rateLimited: 'You have reached a limit. Please try again later.',
    generic: 'Something went wrong. Please try again.',
    offline: "You're offline. Reconnect to continue.",
    permissionDenied: 'You do not have permission to do that.',
  },
  // Form validation messages ({field}/{min} interpolated by call sites).
  validation: {
    required: 'This field is required.',
    invalidEmail: 'Please enter a valid email address.',
    passwordTooShort: 'Password must be at least {min} characters.',
    passwordsMismatch: 'Passwords do not match.',
    nameRequired: 'Please enter your name.',
    invalidPhone: 'Please enter a valid phone number.',
    tooLong: 'Must be {max} characters or fewer.',
    invalidCode: 'Enter the {length}-digit code.',
  },
  // Backend / Firebase auth error codes → friendly copy (mirrors auth_errors.ts).
  // Keys are the normalized code (last path segment), kept identical across locales.
  authErrors: {
    'wrong-password': 'Incorrect email or password.',
    'invalid-credential': 'Incorrect email or password.',
    'user-not-found': 'No account found with that email.',
    'invalid-email': 'Please enter a valid email address.',
    'user-disabled': 'This account has been disabled. Please contact support.',
    'email-already-in-use': 'An account with this email already exists.',
    'weak-password': 'Password is too weak. Use at least 6 characters.',
    'too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'network-request-failed': 'Network error. Check your connection and try again.',
    'popup-closed-by-user': 'Sign-in was cancelled.',
    'popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and try again.',
    'requires-recent-login': 'For your security, please sign in again to complete this action.',
    'invalid-verification-code': 'The verification code is incorrect.',
    'invalid-phone-number': 'Please enter a valid phone number.',
    unauthenticated: 'Please sign in to continue.',
    'permission-denied': 'You do not have permission to do that.',
    'resource-exhausted': 'You have reached a limit. Please try again later.',
    unavailable: 'Service is temporarily unavailable. Please try again.',
  },
  // Notification category labels (mirror backend NotificationCategory).
  notifications: {
    matches: 'New matches',
    messages: 'Messages',
    likes: 'Likes',
    calls: 'Calls',
    profileViews: 'Profile views',
    promotions: 'Promotions',
    subscriptions: 'Subscription',
    safetyAlerts: 'Safety alerts',
    pushChannel: 'Push notifications',
    emailChannel: 'Email notifications',
    newMatchBody: 'You matched with {name}!',
    newMessageBody: '{name} sent you a message',
  },
  // Document/page metadata (for client title sync + future routed metadata).
  meta: {
    title: 'Crush — Find Your Match',
    description:
      'Crush is a modern dating app to help you find meaningful connections. Swipe, match, and chat with people who share your interests.',
  },
  // Plural example: resolved by tPlural('time.minutesAgo', count).
  time: {
    now: 'just now',
    minutesAgo_one: '{count} minute ago',
    minutesAgo_other: '{count} minutes ago',
    hoursAgo_one: '{count} hour ago',
    hoursAgo_other: '{count} hours ago',
    daysAgo_one: '{count} day ago',
    daysAgo_other: '{count} days ago',
  },
} as const;

/**
 * The canonical message shape every locale catalog must satisfy.
 *
 * Each namespace enforces the exact KEY SET from English (via
 * `Record<keyof typeof en.x, string>`) while widening every value to `string`,
 * so a translated catalog must cover the same keys but may hold any locale's
 * text. (A plain `Record<keyof …, string>` per namespace is used instead of a
 * recursive mapped type to avoid a typescript-eslint no-unused-vars crash on
 * mapped/conditional type aliases.)
 */
export interface Messages {
  common: Record<keyof typeof en.common, string>;
  nav: Record<keyof typeof en.nav, string>;
  auth: Record<keyof typeof en.auth, string>;
  discovery: Record<keyof typeof en.discovery, string>;
  chat: Record<keyof typeof en.chat, string>;
  settings: Record<keyof typeof en.settings, string>;
  subscription: Record<keyof typeof en.subscription, string>;
  errors: Record<keyof typeof en.errors, string>;
  validation: Record<keyof typeof en.validation, string>;
  authErrors: Record<keyof typeof en.authErrors, string>;
  notifications: Record<keyof typeof en.notifications, string>;
  meta: Record<keyof typeof en.meta, string>;
  time: Record<keyof typeof en.time, string>;
}
