/**
 * Profile-edit static data + form types (Phase 9 Step 21 decomposition).
 *
 * Extracted from profile-edit-form.tsx to shrink that file and make the option
 * tables independently testable/reusable. Behavior is unchanged.
 */

export { ONBOARDING_INTEREST_OPTIONS as AVAILABLE_INTERESTS } from '@crush/core';

export const PROMPT_QUESTIONS = [
  "I'm looking for...",
  'My ideal first date would be...',
  'Two truths and a lie...',
  'The way to my heart is...',
  'I geek out on...',
  'My most controversial opinion is...',
  'A life goal of mine is...',
  "I'm known for...",
  'My simple pleasures are...',
  "I won't shut up about...",
] as const;

export interface FormData {
  displayName: string;
  birthDate: string;
  gender: 'male' | 'female' | 'non_binary' | 'other' | '';
  sexualOrientation:
    | 'straight'
    | 'gay'
    | 'lesbian'
    | 'bisexual'
    | 'pansexual'
    | 'asexual'
    | 'other'
    | 'prefer_not_to_say'
    | '';
  bio: string;
  interests: string[];
  prompts: { question: string; answer: string }[];
  location: {
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    city: string;
    region?: string;
    country: string;
    capturedAt?: string;
    confirmedAt?: string;
  };
  lifestyle: {
    height: number | '';
    education: string;
    drinking: 'yes' | 'no' | 'sometimes' | '';
    smoking: 'yes' | 'no' | 'sometimes' | '';
    workout: 'active' | 'sometimes' | 'never' | '';
  };
}
