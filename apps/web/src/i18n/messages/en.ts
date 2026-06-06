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
  time: Record<keyof typeof en.time, string>;
}
