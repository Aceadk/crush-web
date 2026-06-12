/**
 * Profile-edit static data + form types (Phase 9 Step 21 decomposition).
 *
 * Extracted from profile-edit-form.tsx to shrink that file and make the option
 * tables independently testable/reusable. Behavior is unchanged.
 */

export const AVAILABLE_INTERESTS = [
  'Travel',
  'Music',
  'Movies',
  'Reading',
  'Cooking',
  'Fitness',
  'Gaming',
  'Photography',
  'Art',
  'Dancing',
  'Hiking',
  'Yoga',
  'Coffee',
  'Wine',
  'Food',
  'Fashion',
  'Tech',
  'Sports',
  'Pets',
  'Nature',
  'Beach',
  'Mountains',
  'Meditation',
  'Writing',
] as const;

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
  bio: string;
  interests: string[];
  prompts: { question: string; answer: string }[];
  location: { city: string; country: string };
  lifestyle: {
    height: string;
    education: string;
    drinking: 'yes' | 'no' | 'sometimes' | '';
    smoking: 'yes' | 'no' | 'sometimes' | '';
    workout: 'active' | 'sometimes' | 'never' | '';
  };
}
