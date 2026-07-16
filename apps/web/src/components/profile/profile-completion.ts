import type { UserProfile } from '@crush/core';

export type ProfileCompletionRequirementId =
  | 'verification'
  | 'username'
  | 'displayName'
  | 'basicInfo'
  | 'discoveryPreferences'
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
  accountVerified?: boolean;
  username?: string;
  displayName?: string;
  birthDate?: string;
  gender?: UserProfile['gender'];
  interestedIn?: UserProfile['interestedIn'];
  photos?: string[];
  photoRecords?: UserProfile['photoRecords'];
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
  // Resolver snapshots deliberately withhold exact coordinates. A trusted
  // server confirmation timestamp is the client-visible completion proof.
  const hasLocation = Boolean(input.location?.confirmedAt);
  const hasApprovedPhoto =
    input.photoRecords?.some((photo) => photo.status === 'approved') ?? false;
  const interestCountIsValid = interestCount >= 3 && interestCount <= 5;

  const requirements: ProfileCompletionRequirement[] = [
    {
      id: 'verification',
      label: 'Verify your account',
      description: 'Firebase Authentication or a verified phone provider must confirm the account.',
      complete: input.accountVerified === true,
      required: true,
    },
    {
      id: 'username',
      label: 'Choose a username',
      description: 'Your unique server-claimed username is required for discovery.',
      complete: /^[a-zA-Z0-9_]{3,20}$/.test(input.username ?? ''),
      required: true,
    },
    {
      id: 'displayName',
      label: 'Add your display name',
      description: 'Use the name people should recognize in discovery.',
      complete: Boolean(input.displayName?.trim()),
      required: true,
    },
    {
      id: 'basicInfo',
      label: 'Complete basic information',
      description: 'Add your adult date of birth and gender.',
      complete: Boolean(input.birthDate) && Boolean(input.gender),
      required: true,
    },
    {
      id: 'discoveryPreferences',
      label: 'Choose discovery preferences',
      description: 'Select at least one gender you would like to discover.',
      complete: (input.interestedIn?.length ?? 0) > 0,
      required: false,
    },
    {
      id: 'photos',
      label: 'Add at least 1 profile photo',
      description: 'A clear photo is required before your profile can be visible.',
      complete: hasApprovedPhoto,
      required: true,
    },
    {
      id: 'bio',
      label: 'Write a short bio',
      description: 'Use at least 7 characters so people have a conversation starter.',
      complete: bioLength >= 7,
      required: true,
    },
    {
      id: 'interests',
      label: 'Pick 3 interests',
      description: 'Interests improve match quality and make your profile easier to scan.',
      complete: interestCountIsValid,
      required: true,
    },
    {
      id: 'location',
      label: 'Confirm your current location',
      description: 'A server-confirmed coordinate capture keeps nearby discovery accurate.',
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

  const missingRequired = requirements.filter(
    (requirement) => requirement.required && !requirement.complete
  );
  const missingRecommended = requirements.filter(
    (requirement) => !requirement.required && !requirement.complete
  );

  return {
    percent: Math.round(
      (requirements.filter((requirement) => requirement.required && requirement.complete).length /
        requirements.filter((requirement) => requirement.required).length) *
        100
    ),
    requirements,
    missingRequired,
    missingRecommended,
    canSaveVisibleProfile: missingRequired.length === 0,
    primaryMessage: buildPrimaryCompletionMessage(missingRequired, missingRecommended),
  };
}

export function buildProfileCompletionStateFromProfile(
  profile: UserProfile | null | undefined,
  accountVerified: boolean
): ProfileCompletionState {
  return buildProfileCompletionState({
    // Authentication truth must be supplied by the caller. Firestore mirrors
    // are display/query conveniences and must never become an authorization gate.
    accountVerified,
    username: profile?.username,
    displayName: profile?.displayName,
    birthDate: profile?.birthDate,
    gender: profile?.gender,
    interestedIn: profile?.interestedIn,
    bio: profile?.bio,
    interests: profile?.interests,
    location: profile?.location,
    photos: profile?.photos,
    photoRecords: profile?.photoRecords,
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
