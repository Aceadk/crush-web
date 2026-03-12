import type { Page } from '@playwright/test';

type E2EScenario = 'onboarding' | 'discovery' | 'chat';

interface E2EAuthOptions {
  scenario?: E2EScenario;
  onboardingComplete?: boolean;
  emailVerified?: boolean;
}

const E2E_USER_ID = 'e2e-user-1';
const E2E_USER_EMAIL = 'e2e-user@example.com';
const E2E_USER_NAME = 'E2E Tester';
const E2E_USER_PHOTO = 'https://lh3.googleusercontent.com/a/default-user=s256-c';

export async function bootstrapE2EAuth(page: Page, options: E2EAuthOptions = {}) {
  const scenario = options.scenario ?? 'discovery';
  const onboardingComplete = options.onboardingComplete ?? scenario !== 'onboarding';
  const emailVerified = options.emailVerified ?? true;

  await page.context().addCookies([
    {
      name: 'auth-token',
      value: 'e2e-auth-token',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  await page.context().addInitScript(
    ({ scenarioName, profileOnboardingComplete, profileEmailVerified }) => {
      const now = new Date().toISOString();
      const root = window as Window & {
        __CRUSH_E2E_AUTH_STATE__?: unknown;
      };

      root.__CRUSH_E2E_AUTH_STATE__ = {
        scenario: scenarioName,
        user: {
          uid: 'e2e-user-1',
          email: 'e2e-user@example.com',
          emailVerified: profileEmailVerified,
          displayName: 'E2E Tester',
          photoURL: 'https://lh3.googleusercontent.com/a/default-user=s256-c',
          getIdToken: async () => 'e2e-token',
          reload: async () => {},
        },
        profile: {
          id: 'e2e-user-1',
          email: 'e2e-user@example.com',
          displayName: 'E2E Tester',
          photos: ['https://lh3.googleusercontent.com/a/default-user=s256-c'],
          profilePhotoUrl: 'https://lh3.googleusercontent.com/a/default-user=s256-c',
          bio: 'Deterministic test profile for E2E.',
          interests: ['Coffee', 'Music', 'Travel'],
          isVerified: true,
          subscriptionTier: 'free',
          createdAt: now,
          updatedAt: now,
          hasAcceptedTerms: true,
          onboardingComplete: profileOnboardingComplete,
          profileComplete: profileOnboardingComplete,
          isEmailVerified: profileEmailVerified,
          isPhoneVerified: false,
        },
      };

      localStorage.setItem('crush-theme', 'system');
      document.cookie = 'crush-theme=system; path=/; SameSite=Lax';
    },
    {
      scenarioName: scenario,
      profileOnboardingComplete: onboardingComplete,
      profileEmailVerified: emailVerified,
    }
  );

  await page.context().addCookies([
    {
      name: 'crush-theme',
      value: 'system',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

export const e2eAuthConstants = {
  userId: E2E_USER_ID,
  userEmail: E2E_USER_EMAIL,
  userName: E2E_USER_NAME,
  userPhoto: E2E_USER_PHOTO,
  matchId: 'e2e-match-1',
  otherUserName: 'Taylor QA',
};
