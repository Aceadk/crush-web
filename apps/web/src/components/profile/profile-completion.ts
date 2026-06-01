import type { UserProfile } from '@crush/core';

export type ProfileCompletionRequirementId =
  | 'displayName'
  | 'photos'
  | 'bio'
  | 'interests'
  | 'location'
  | 'prompts';

export interface ProfileCompletionRequirement {
  id: ProfileCompletionRequirementId;
  label: string;
  description: string;
  complete: boolean;
  required: boolean;
}

export interface ProfileCompletionInput {
  displayName?: string;
  photos?: string[];
  bio?: string;
  interests?: string[];
  location?: UserProfile['location'];
  prompts?: UserProfile['prompts'];
}

export interface ProfileCompletionState {
  percent: number;
  requirements: ProfileCompletionRequirement[];
  missingRequired: ProfileCompletionRequirement[];
  missingRecommended: ProfileCompletionRequirement[];
  canSaveVisibleProfile: boolean;
  primaryMessage: string;
}

export function buildProfileCompletionState(input: ProfileCompletionInput): ProfileCompletionState {
  const bioLength = input.bio?.trim().length ?? 0;
  const interestCount = input.interests?.length ?? 0;
  const promptCount =
    input.prompts?.filter((prompt) => prompt.answer.trim().length > 0).length ?? 0;
  const hasLocation =
    Boolean(input.location?.city?.trim()) && Boolean(input.location?.country?.trim());

  const requirements: ProfileCompletionRequirement[] = [
    {
      id: 'displayName',
      label: 'Add your display name',
      description: 'Use the name people should recognize in discovery.',
      complete: Boolean(input.displayName?.trim()),
      required: true,
    },
    {
      id: 'photos',
      label: 'Add at least 1 profile photo',
      description: 'A clear photo is required before your profile can be visible.',
      complete: (input.photos?.length ?? 0) >= 1,
      required: true,
    },
    {
      id: 'bio',
      label: 'Write a short bio',
      description: 'Use at least 20 characters so people have a conversation starter.',
      complete: bioLength >= 20,
      required: true,
    },
    {
      id: 'interests',
      label: 'Pick 3 interests',
      description: 'Interests improve match quality and make your profile easier to scan.',
      complete: interestCount >= 3,
      required: true,
    },
    {
      id: 'location',
      label: 'Add city and country',
      description: 'Location keeps distance and nearby discovery behavior predictable.',
      complete: hasLocation,
      required: true,
    },
    {
      id: 'prompts',
      label: 'Answer at least 1 prompt',
      description: 'Prompts are optional, but they make first messages easier.',
      complete: promptCount >= 1,
      required: false,
    },
  ];

  const weightedScore = requirements.reduce((score, requirement) => {
    if (!requirement.complete) return score;
    switch (requirement.id) {
      case 'displayName':
        return score + 15;
      case 'photos':
        return score + 25;
      case 'bio':
        return score + 20;
      case 'interests':
        return score + 20;
      case 'location':
        return score + 10;
      case 'prompts':
        return score + 10;
    }
  }, 0);

  const missingRequired = requirements.filter(
    (requirement) => requirement.required && !requirement.complete
  );
  const missingRecommended = requirements.filter(
    (requirement) => !requirement.required && !requirement.complete
  );

  return {
    percent: Math.min(weightedScore, 100),
    requirements,
    missingRequired,
    missingRecommended,
    canSaveVisibleProfile: missingRequired.length === 0,
    primaryMessage: buildPrimaryCompletionMessage(missingRequired, missingRecommended),
  };
}

export function buildProfileCompletionStateFromProfile(
  profile: UserProfile | null | undefined
): ProfileCompletionState {
  return buildProfileCompletionState({
    displayName: profile?.displayName,
    bio: profile?.bio,
    interests: profile?.interests,
    location: profile?.location,
    photos: profile?.photos,
    prompts: profile?.prompts,
  });
}

function buildPrimaryCompletionMessage(
  missingRequired: ProfileCompletionRequirement[],
  missingRecommended: ProfileCompletionRequirement[]
): string {
  if (missingRequired.length > 0) {
    return 'Complete the required items before your profile is visible in matching.';
  }

  if (missingRecommended.length > 0) {
    return 'Your profile can be visible. Add the recommended details to improve replies.';
  }

  return 'Your profile is ready for matching.';
}
