import type { User } from 'firebase/auth';
import { callables } from '../api/callables';
import type { OnboardingWireStepKey } from '../api/callables';
import type { Gender, SexualOrientation, UserProfile } from '../types/user';

export const ONBOARDING_SCHEMA_VERSION = 2 as const;
export const MIN_ONBOARDING_BIO_LENGTH = 7;
export const MIN_ONBOARDING_INTERESTS = 3;
export const MAX_ONBOARDING_INTERESTS = 5;

export type OnboardingStepKey = OnboardingWireStepKey;

export interface OnboardingStepDefinition {
  key: OnboardingStepKey;
  title: string;
  required: boolean;
  webApplicable: boolean;
  destinationOnly?: boolean;
}

/**
 * One stable registry is shared by routing, progress, readiness, and tests.
 * Identity verification remains represented for cross-platform parity, but is
 * honestly marked unavailable on web until a real backend-backed UI exists.
 */
export const ONBOARDING_STEP_REGISTRY: readonly OnboardingStepDefinition[] = [
  {
    key: 'emailVerification',
    title: 'Email verification',
    required: true,
    webApplicable: false,
  },
  {
    key: 'phoneVerification',
    title: 'Phone verification',
    required: true,
    webApplicable: false,
  },
  { key: 'terms', title: 'Terms & safety', required: true, webApplicable: true },
  { key: 'username', title: 'Username', required: true, webApplicable: true },
  { key: 'basicInfo', title: 'Basic info', required: true, webApplicable: true },
  {
    key: 'idVerification',
    title: 'Identity verification',
    required: false,
    webApplicable: false,
  },
  {
    key: 'discoveryPreferences',
    title: 'Discovery preferences',
    required: false,
    webApplicable: true,
  },
  { key: 'photos', title: 'Photos', required: true, webApplicable: true },
  { key: 'aboutMe', title: 'About me', required: true, webApplicable: true },
  { key: 'location', title: 'Location', required: true, webApplicable: true },
  { key: 'workEducation', title: 'Work & education', required: false, webApplicable: true },
  { key: 'interests', title: 'Interests', required: true, webApplicable: true },
  { key: 'favourites', title: 'Favourites', required: false, webApplicable: true },
  { key: 'ready', title: 'Ready', required: true, webApplicable: true },
  {
    key: 'discovery',
    title: 'Discovery',
    required: false,
    webApplicable: true,
    destinationOnly: true,
  },
] as const;

export const WEB_ONBOARDING_STEP_KEYS = ONBOARDING_STEP_REGISTRY.filter(
  (step) => step.webApplicable && !step.destinationOnly
).map((step) => step.key);

/** Resolve a stable `?step=` value; browser Back/Forward can safely replay it. */
export function resolveWebOnboardingStep(
  requested: string | null | undefined,
  fallback: OnboardingStepKey
): OnboardingStepKey {
  if (
    requested &&
    VALID_STEP_KEYS.has(requested as OnboardingStepKey) &&
    WEB_ONBOARDING_STEP_KEYS.includes(requested as OnboardingStepKey)
  ) {
    return requested as OnboardingStepKey;
  }
  return WEB_ONBOARDING_STEP_KEYS.includes(fallback) ? fallback : 'terms';
}

export function buildOnboardingStepQuery(currentQuery: string, stepKey: OnboardingStepKey): string {
  const params = new URLSearchParams(
    currentQuery.startsWith('?') ? currentQuery.slice(1) : currentQuery
  );
  params.set('step', resolveWebOnboardingStep(stepKey, 'terms'));
  return params.toString();
}

export const ONBOARDING_INTEREST_OPTIONS = [
  ['travel', 'Travel'],
  ['music', 'Music'],
  ['movies', 'Movies'],
  ['reading', 'Reading'],
  ['cooking', 'Cooking'],
  ['fitness', 'Fitness'],
  ['gaming', 'Gaming'],
  ['photography', 'Photography'],
  ['art', 'Art'],
  ['dancing', 'Dancing'],
  ['hiking', 'Hiking'],
  ['yoga', 'Yoga'],
  ['coffee', 'Coffee'],
  ['food', 'Food'],
  ['fashion', 'Fashion'],
  ['tech', 'Tech'],
  ['sports', 'Sports'],
  ['pets', 'Pets'],
  ['nature', 'Nature'],
  ['meditation', 'Meditation'],
] as const satisfies readonly (readonly [string, string])[];

export type OnboardingPhotoStatus =
  | 'uploading'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'unknown';

export interface OnboardingPhoto {
  mediaId?: string;
  storagePath?: string;
  downloadUrl?: string;
  status: OnboardingPhotoStatus;
  reason?: string;
  isPrimary?: boolean;
}

export interface ConfirmedOnboardingLocation {
  /** Exact coordinates stay in the server-only user_locations record. */
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  capturedAt?: string;
  confirmedAt?: string;
  city?: string;
  region?: string;
  country?: string;
}

export interface OnboardingWorkEducation {
  jobTitle?: string;
  company?: string;
  school?: string;
}

export type OnboardingFavourites = Record<string, string>;

export interface CanonicalOnboardingSnapshot {
  schemaVersion: number;
  uid?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  hasAcceptedTerms: boolean;
  username: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender | '';
  sexualOrientation: SexualOrientation | null;
  interestedIn: Gender[];
  photos: OnboardingPhoto[];
  bio: string;
  location: ConfirmedOnboardingLocation | null;
  workEducation: OnboardingWorkEducation;
  interests: string[];
  favourites: OnboardingFavourites;
  completedSteps: OnboardingStepKey[];
  skippedSteps: OnboardingStepKey[];
  completedAt?: string;
  updatedAt?: string;
}

export interface AuthVerificationFacts {
  uid?: string;
  hasEmail: boolean;
  emailVerified: boolean;
  hasPhoneNumber?: boolean;
  providerIds: string[];
}

export interface OnboardingMissingRequirement {
  code: string;
  stepKey: OnboardingStepKey;
  message: string;
}

export interface OnboardingCompletionMetric {
  complete: number;
  total: number;
  percent: number;
}

export interface OnboardingReadiness {
  canStartMatching: boolean;
  requiredCompletion: OnboardingCompletionMetric;
  optionalCompletion: OnboardingCompletionMetric;
  missingRequirements: OnboardingMissingRequirement[];
  firstIncompleteStep: OnboardingStepKey;
}

export interface OnboardingResolution {
  schemaVersion: number;
  snapshot: CanonicalOnboardingSnapshot;
  readiness: OnboardingReadiness;
  destination: OnboardingStepKey | string;
}

export interface ValidateProfilePhotoResult {
  schemaVersion: number;
  mediaId: string;
  status: OnboardingPhotoStatus;
  reason?: string;
  downloadUrl?: string;
  snapshot?: CanonicalOnboardingSnapshot;
  readiness?: OnboardingReadiness;
}

export class OnboardingServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'OnboardingServiceError';
  }
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const VALID_STEP_KEYS = new Set<OnboardingStepKey>(
  ONBOARDING_STEP_REGISTRY.map((step) => step.key)
);
const VALID_GENDERS = new Set<Gender>(['male', 'female', 'non_binary', 'other']);
const VALID_PHOTO_STATUSES = new Set<OnboardingPhotoStatus>([
  'uploading',
  'processing',
  'approved',
  'rejected',
  'failed',
  'unknown',
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(nonEmptyString).filter((entry): entry is string => Boolean(entry))
    : [];
}

function timestampString(value: unknown): string | undefined {
  const text = nonEmptyString(value);
  if (text) return text;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  const source = asRecord(value);
  const seconds = finiteNumber(source.seconds) ?? finiteNumber(source._seconds);
  if (seconds !== undefined) return new Date(seconds * 1000).toISOString();
  const toDate = source.toDate;
  if (typeof toDate === 'function') {
    const date = (toDate as (this: object) => Date).call(value as object);
    if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
}

function stepArray(value: unknown): OnboardingStepKey[] {
  const legacyAliases: Record<string, OnboardingStepKey> = {
    verification: 'emailVerification',
    identityVerification: 'idVerification',
  };
  return stringArray(value).flatMap((entry) => {
    const canonical = legacyAliases[entry] ?? entry;
    return VALID_STEP_KEYS.has(canonical as OnboardingStepKey)
      ? [canonical as OnboardingStepKey]
      : [];
  });
}

function genderArray(value: unknown): Gender[] {
  return stringArray(value).filter((entry): entry is Gender => VALID_GENDERS.has(entry as Gender));
}

function parseDate(value: unknown): string | undefined {
  const text = nonEmptyString(value);
  if (text) return text.slice(0, 10);
  return timestampString(value)?.slice(0, 10);
}

export function normalizeInterestId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function calculateCalendarAge(birthDate: string, now = new Date()): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.slice(0, 10));
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  ) {
    return undefined;
  }
  let age = now.getUTCFullYear() - year;
  if (
    now.getUTCMonth() + 1 < month ||
    (now.getUTCMonth() + 1 === month && now.getUTCDate() < day)
  ) {
    age -= 1;
  }
  return age >= 0 ? age : undefined;
}

export function latestAllowedAdultBirthDate(now = new Date()): string {
  const year = now.getUTCFullYear() - 18;
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const candidate = new Date(Date.UTC(year, month, day));
  // Feb 29 rolls into March in non-leap years; Feb 28 is the latest birthday
  // that is unambiguously already 18 in that case.
  if (candidate.getUTCMonth() !== month) candidate.setUTCDate(0);
  return candidate.toISOString().slice(0, 10);
}

export function authVerificationFactsFromUser(user: User | null): AuthVerificationFacts {
  return {
    uid: user?.uid,
    hasEmail: Boolean(user?.email),
    emailVerified: Boolean(user?.emailVerified),
    hasPhoneNumber: Boolean(user?.phoneNumber),
    providerIds: user?.providerData.map((provider) => provider.providerId) ?? [],
  };
}

export function isAccountVerified(facts: AuthVerificationFacts): boolean {
  // Matches backend token semantics: whenever an email claim exists it must be
  // verified. Phone-only users are accepted. A linked phone provider must not
  // hide an unverified email claim.
  if (facts.hasEmail) return facts.emailVerified;
  return facts.hasPhoneNumber === true && facts.providerIds.includes('phone');
}

function parsePhotos(value: unknown): OnboardingPhoto[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap<OnboardingPhoto>((entry, index) => {
    if (typeof entry === 'string' && entry.trim()) {
      return [{ downloadUrl: entry.trim(), status: 'unknown' as const, isPrimary: index === 0 }];
    }
    const source = asRecord(entry);
    const downloadUrl =
      nonEmptyString(source.downloadUrl) ??
      nonEmptyString(source.url) ??
      nonEmptyString(source.photoUrl);
    const mediaId = nonEmptyString(source.mediaId) ?? nonEmptyString(source.id);
    if (!downloadUrl && !mediaId) return [];
    const rawStatus = nonEmptyString(source.status)?.toLowerCase() as
      | OnboardingPhotoStatus
      | undefined;
    return [
      {
        mediaId,
        storagePath: nonEmptyString(source.storagePath),
        downloadUrl,
        status: rawStatus && VALID_PHOTO_STATUSES.has(rawStatus) ? rawStatus : 'unknown',
        reason: nonEmptyString(source.reason),
        isPrimary: source.isPrimary === true || index === 0,
      },
    ];
  });
}

function parseLocation(value: unknown): ConfirmedOnboardingLocation | null {
  const source = asRecord(value);
  const latitude = finiteNumber(source.latitude);
  const longitude = finiteNumber(source.longitude);
  const confirmedAt =
    timestampString(source.confirmedAt) ?? timestampString(source.locationConfirmedAt);
  if ((latitude === undefined || longitude === undefined) && !confirmedAt) return null;
  return {
    latitude,
    longitude,
    accuracyMeters: finiteNumber(source.accuracyMeters) ?? finiteNumber(source.accuracy),
    capturedAt: timestampString(source.capturedAt),
    confirmedAt,
    city: nonEmptyString(source.city),
    region: nonEmptyString(source.region) ?? nonEmptyString(source.state),
    country: nonEmptyString(source.country),
  };
}

function defaultSnapshot(): CanonicalOnboardingSnapshot {
  return {
    schemaVersion: ONBOARDING_SCHEMA_VERSION,
    hasAcceptedTerms: false,
    username: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: '',
    sexualOrientation: null,
    interestedIn: [],
    photos: [],
    bio: '',
    location: null,
    workEducation: {},
    interests: [],
    favourites: {},
    completedSteps: [],
    skippedSteps: [],
  };
}

export function normalizeOnboardingSnapshot(value: unknown): CanonicalOnboardingSnapshot {
  const root = asRecord(value);
  const profile = asRecord(root.profile);
  const verification = asRecord(root.verification);
  const metadata = asRecord(root.onboarding);
  const location =
    parseLocation(root.location) ?? parseLocation(profile.location) ?? parseLocation(profile);
  const rawGender = nonEmptyString(root.gender) ?? nonEmptyString(profile.gender);
  const gender = rawGender && VALID_GENDERS.has(rawGender as Gender) ? (rawGender as Gender) : '';
  const orientation =
    nonEmptyString(root.sexualOrientation) ?? nonEmptyString(profile.sexualOrientation) ?? null;
  const work = asRecord(root.workEducation);
  const favourites = asRecord(root.favourites);
  const photos = parsePhotos(root.photos).length
    ? parsePhotos(root.photos)
    : parsePhotos(root.photoRecords).length
      ? parsePhotos(root.photoRecords)
      : parsePhotos(profile.photos).length
        ? parsePhotos(profile.photos)
        : parsePhotos(profile.photoUrls);
  const interests = (
    stringArray(root.interests).length
      ? stringArray(root.interests)
      : stringArray(profile.interests)
  ).map(normalizeInterestId);

  return {
    ...defaultSnapshot(),
    schemaVersion: finiteNumber(root.schemaVersion) ?? ONBOARDING_SCHEMA_VERSION,
    uid: nonEmptyString(root.uid),
    emailVerified:
      typeof root.emailVerified === 'boolean'
        ? root.emailVerified
        : typeof verification.emailVerified === 'boolean'
          ? verification.emailVerified
          : undefined,
    phoneVerified:
      typeof root.phoneVerified === 'boolean'
        ? root.phoneVerified
        : typeof verification.phoneVerified === 'boolean'
          ? verification.phoneVerified
          : undefined,
    hasAcceptedTerms:
      root.hasAcceptedTerms === true ||
      root.termsAccepted === true ||
      profile.hasAcceptedTerms === true,
    username: nonEmptyString(root.username) ?? nonEmptyString(profile.username) ?? '',
    firstName:
      nonEmptyString(root.firstName) ??
      nonEmptyString(profile.firstName) ??
      nonEmptyString(root.displayName) ??
      nonEmptyString(profile.name) ??
      '',
    lastName: nonEmptyString(root.lastName) ?? nonEmptyString(profile.lastName) ?? '',
    birthDate: parseDate(root.birthDate) ?? parseDate(profile.birthDate) ?? '',
    gender,
    sexualOrientation: gender === 'non_binary' ? (orientation as SexualOrientation | null) : null,
    interestedIn: genderArray(root.interestedIn).length
      ? genderArray(root.interestedIn)
      : genderArray(asRecord(profile.preferences).showMeGenders),
    photos,
    bio: nonEmptyString(root.bio) ?? nonEmptyString(profile.bio) ?? '',
    location,
    workEducation: {
      jobTitle: nonEmptyString(work.jobTitle) ?? nonEmptyString(profile.jobTitle),
      company: nonEmptyString(work.company) ?? nonEmptyString(profile.company),
      school: nonEmptyString(work.school) ?? nonEmptyString(profile.school),
    },
    interests: Array.from(new Set(interests.filter(Boolean))),
    favourites: Object.fromEntries(
      Object.entries(Object.keys(favourites).length ? favourites : asRecord(profile.favourites))
        .map(([key, entry]) => [key, nonEmptyString(entry)])
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
    ),
    completedSteps: stepArray(root.completedSteps).length
      ? stepArray(root.completedSteps)
      : stepArray(metadata.completedStepKeys).length
        ? stepArray(metadata.completedStepKeys)
        : stepArray(metadata.completedSteps),
    skippedSteps: stepArray(root.skippedSteps).length
      ? stepArray(root.skippedSteps)
      : stepArray(metadata.skippedOptionalStepKeys).length
        ? stepArray(metadata.skippedOptionalStepKeys)
        : stepArray(metadata.skippedSteps),
    completedAt: timestampString(root.completedAt) ?? timestampString(metadata.completedAt),
    updatedAt: timestampString(root.updatedAt) ?? timestampString(metadata.updatedAt),
  };
}

/** Server facts win. A UID-scoped local draft only fills facts the server has not stored yet. */
export function hydrateOnboardingDraft(
  serverValue: unknown,
  localValue?: unknown
): CanonicalOnboardingSnapshot {
  const server = normalizeOnboardingSnapshot(serverValue);
  const local = normalizeOnboardingSnapshot(localValue);
  const choose = (serverText: string, localText: string) => serverText || localText;
  const serverWork = server.workEducation;
  const localWork = local.workEducation;

  return {
    ...local,
    ...server,
    hasAcceptedTerms: server.hasAcceptedTerms,
    username: choose(server.username, local.username),
    firstName: choose(server.firstName, local.firstName),
    lastName: choose(server.lastName, local.lastName),
    birthDate: choose(server.birthDate, local.birthDate),
    gender: server.gender || local.gender,
    sexualOrientation:
      (server.gender || local.gender) === 'non_binary'
        ? (server.sexualOrientation ?? local.sexualOrientation)
        : null,
    interestedIn: server.interestedIn.length ? server.interestedIn : local.interestedIn,
    photos: server.photos.length ? server.photos : local.photos,
    bio: choose(server.bio, local.bio),
    location: server.location ?? local.location,
    workEducation: {
      jobTitle: serverWork.jobTitle ?? localWork.jobTitle,
      company: serverWork.company ?? localWork.company,
      school: serverWork.school ?? localWork.school,
    },
    interests: server.interests.length ? server.interests : local.interests,
    favourites: Object.keys(server.favourites).length ? server.favourites : local.favourites,
    completedSteps: Array.from(new Set([...local.completedSteps, ...server.completedSteps])),
    skippedSteps: Array.from(new Set([...local.skippedSteps, ...server.skippedSteps])),
  };
}

export function snapshotFromProfile(profile: UserProfile | null): CanonicalOnboardingSnapshot {
  if (!profile) return defaultSnapshot();
  return normalizeOnboardingSnapshot({
    schemaVersion: profile.onboardingSchemaVersion,
    uid: profile.id,
    emailVerified: profile.isEmailVerified,
    phoneVerified: profile.isPhoneVerified,
    hasAcceptedTerms: profile.hasAcceptedTerms,
    username: profile.username,
    firstName: profile.displayName,
    lastName: profile.lastName,
    birthDate: profile.birthDate,
    gender: profile.gender,
    sexualOrientation: profile.sexualOrientation,
    interestedIn: profile.interestedIn,
    photos: profile.photoRecords?.length ? profile.photoRecords : profile.photos,
    bio: profile.bio,
    location: profile.location,
    workEducation: {
      jobTitle: profile.jobTitle,
      company: profile.company,
      school: profile.school,
    },
    interests: profile.interests,
    favourites: profile.favourites,
    completedSteps: profile.onboardingCompletedSteps,
    skippedSteps: profile.onboardingSkippedSteps,
    completedAt: profile.onboardingCompletedAt,
  });
}

function missingRequirement(
  code: string,
  stepKey: OnboardingStepKey,
  message: string
): OnboardingMissingRequirement {
  return { code, stepKey, message };
}

function optionalStepComplete(
  snapshot: CanonicalOnboardingSnapshot,
  key: OnboardingStepKey
): boolean {
  if (snapshot.skippedSteps.includes(key) || snapshot.completedSteps.includes(key)) return true;
  if (key === 'discoveryPreferences') return snapshot.interestedIn.length > 0;
  if (key === 'workEducation') {
    return Object.values(snapshot.workEducation).some((value) => Boolean(value?.trim()));
  }
  if (key === 'favourites') return Object.keys(snapshot.favourites).length > 0;
  return true;
}

export function evaluateOnboardingReadiness(
  snapshotValue: unknown,
  authFacts: AuthVerificationFacts
): OnboardingReadiness {
  const snapshot = normalizeOnboardingSnapshot(snapshotValue);
  const missing: OnboardingMissingRequirement[] = [];
  if (!isAccountVerified(authFacts)) {
    missing.push(
      missingRequirement(
        'auth_verification_required',
        authFacts.hasEmail ? 'emailVerification' : 'phoneVerification',
        'Verify your account to continue.'
      )
    );
  }
  if (!snapshot.hasAcceptedTerms) {
    missing.push(
      missingRequirement(
        'terms',
        'terms',
        'Accept the Terms, Privacy Policy, and Community Guidelines.'
      )
    );
  }
  if (!USERNAME_PATTERN.test(snapshot.username)) {
    missing.push(
      missingRequirement(
        'username',
        'username',
        'Choose a unique username with 3–20 letters, numbers, or underscores.'
      )
    );
  }
  const age = calculateCalendarAge(snapshot.birthDate);
  if (!snapshot.firstName.trim() || age === undefined || age < 18 || !snapshot.gender) {
    missing.push(
      missingRequirement(
        'basic_info',
        'basicInfo',
        'Add your first name, valid adult date of birth, and gender.'
      )
    );
  }
  if (!snapshot.photos.some((photo) => photo.status === 'approved')) {
    missing.push(
      missingRequirement(
        'approved_photo',
        'photos',
        'Add at least one server-approved profile photo.'
      )
    );
  }
  if (snapshot.bio.trim().length < MIN_ONBOARDING_BIO_LENGTH) {
    missing.push(
      missingRequirement(
        'bio',
        'aboutMe',
        `Write a bio with at least ${MIN_ONBOARDING_BIO_LENGTH} characters.`
      )
    );
  }
  if (!snapshot.location?.confirmedAt) {
    missing.push(
      missingRequirement(
        'confirmed_location',
        'location',
        'Capture and confirm your current location.'
      )
    );
  }
  if (
    snapshot.interests.length < MIN_ONBOARDING_INTERESTS ||
    snapshot.interests.length > MAX_ONBOARDING_INTERESTS
  ) {
    missing.push(
      missingRequirement(
        'interests',
        'interests',
        `Choose ${MIN_ONBOARDING_INTERESTS}–${MAX_ONBOARDING_INTERESTS} interests.`
      )
    );
  }

  const requiredTotal = 8;
  const requiredComplete = requiredTotal - missing.length;
  const optionalKeys: OnboardingStepKey[] = ['discoveryPreferences', 'workEducation', 'favourites'];
  const optionalComplete = optionalKeys.filter((key) => optionalStepComplete(snapshot, key)).length;
  const missingRequiredSteps = new Set(missing.map((entry) => entry.stepKey));
  const verificationStep = missing.find(
    (entry) => entry.stepKey === 'emailVerification' || entry.stepKey === 'phoneVerification'
  )?.stepKey;
  const firstIncompleteStep =
    verificationStep ??
    ONBOARDING_STEP_REGISTRY.find((step) => {
      if (!step.webApplicable || step.destinationOnly || step.key === 'ready') return false;
      if (missingRequiredSteps.has(step.key)) return true;
      return !step.required && !optionalStepComplete(snapshot, step.key);
    })?.key ??
    (snapshot.completedAt ? 'discovery' : 'ready');

  return {
    canStartMatching: missing.length === 0,
    requiredCompletion: {
      complete: Math.max(0, requiredComplete),
      total: requiredTotal,
      percent: Math.round((Math.max(0, requiredComplete) / requiredTotal) * 100),
    },
    optionalCompletion: {
      complete: optionalComplete,
      total: optionalKeys.length,
      percent: Math.round((optionalComplete / optionalKeys.length) * 100),
    },
    missingRequirements: missing,
    firstIncompleteStep,
  };
}

function parseMetric(
  value: unknown,
  fallback: OnboardingCompletionMetric
): OnboardingCompletionMetric {
  const fraction = finiteNumber(value);
  if (fraction !== undefined) {
    const normalized = Math.max(0, Math.min(1, fraction));
    return {
      complete: normalized * fallback.total,
      total: fallback.total,
      percent: Math.round(normalized * 100),
    };
  }
  const source = asRecord(value);
  return {
    complete: finiteNumber(source.complete) ?? fallback.complete,
    total: finiteNumber(source.total) ?? fallback.total,
    percent: finiteNumber(source.percent) ?? fallback.percent,
  };
}

function isVerificationStep(stepKey: string | undefined): boolean {
  return stepKey === 'emailVerification' || stepKey === 'phoneVerification';
}

function isAuthVerificationRequirement(requirement: OnboardingMissingRequirement): boolean {
  return (
    requirement.code === 'auth_verification_required' || isVerificationStep(requirement.stepKey)
  );
}

function reconcileAuthCompletionMetric(
  metric: OnboardingCompletionMetric,
  serverBlockedOnAuth: boolean,
  clientBlockedOnAuth: boolean
): OnboardingCompletionMetric {
  if (serverBlockedOnAuth === clientBlockedOnAuth || metric.total <= 0) return metric;
  const adjustment = serverBlockedOnAuth ? 1 : -1;
  const complete = Math.max(0, Math.min(metric.total, metric.complete + adjustment));
  return {
    ...metric,
    complete,
    percent: Math.round((complete / metric.total) * 100),
  };
}

export function normalizeOnboardingResolution(
  value: unknown,
  authFacts: AuthVerificationFacts
): OnboardingResolution {
  const source = asRecord(value);
  const serverSnapshot = normalizeOnboardingSnapshot(source.snapshot ?? source);
  const accountVerified = isAccountVerified(authFacts);
  // The Firebase User values sampled by the caller are the client-side source
  // of truth. The callable independently enforces the freshly presented ID
  // token; profile mirrors in a response must never overwrite either result.
  const snapshot: CanonicalOnboardingSnapshot = {
    ...serverSnapshot,
    emailVerified: authFacts.hasEmail ? authFacts.emailVerified : false,
    phoneVerified: authFacts.hasPhoneNumber === true && authFacts.providerIds.includes('phone'),
    completedSteps: accountVerified
      ? serverSnapshot.completedSteps
      : serverSnapshot.completedSteps.filter((step) => !isVerificationStep(step)),
  };
  const localReadiness = evaluateOnboardingReadiness(snapshot, authFacts);
  const readinessSource = asRecord(source.readiness);
  const parsedMissing = Array.isArray(readinessSource.missingRequirements)
    ? readinessSource.missingRequirements.flatMap((entry) => {
        const item = asRecord(entry);
        const stepKey = nonEmptyString(item.stepKey);
        const code = nonEmptyString(item.code);
        const message = nonEmptyString(item.message);
        const canonicalStepKey = stepArray(stepKey ? [stepKey] : [])[0];
        if (!canonicalStepKey || !code || !message) return [];
        return [{ stepKey: canonicalStepKey, code, message }];
      })
    : localReadiness.missingRequirements;
  const serverBlockedOnAuth = parsedMissing.some(isAuthVerificationRequirement);
  const localAuthRequirement = localReadiness.missingRequirements.find(
    isAuthVerificationRequirement
  );
  const missing = parsedMissing.filter(
    (requirement) => !isAuthVerificationRequirement(requirement)
  );
  if (!accountVerified && localAuthRequirement) missing.unshift(localAuthRequirement);

  const rawFirstStep = nonEmptyString(readinessSource.firstIncompleteStep);
  const serverFirstIncompleteStep = stepArray(rawFirstStep ? [rawFirstStep] : [])[0];
  const reconciledFirstIncompleteStep = missing[0]?.stepKey ?? localReadiness.firstIncompleteStep;
  const firstIncompleteStep = !accountVerified
    ? (localAuthRequirement?.stepKey ?? reconciledFirstIncompleteStep)
    : serverFirstIncompleteStep && !isVerificationStep(serverFirstIncompleteStep)
      ? serverFirstIncompleteStep
      : reconciledFirstIncompleteStep;
  const parsedRequiredCompletion = parseMetric(
    readinessSource.requiredCompletion,
    localReadiness.requiredCompletion
  );
  const readiness: OnboardingReadiness = {
    canStartMatching: !accountVerified
      ? false
      : typeof readinessSource.canStartMatching !== 'boolean'
        ? localReadiness.canStartMatching
        : readinessSource.canStartMatching || (serverBlockedOnAuth && missing.length === 0),
    requiredCompletion: reconcileAuthCompletionMetric(
      parsedRequiredCompletion,
      serverBlockedOnAuth,
      !accountVerified
    ),
    optionalCompletion: parseMetric(
      readinessSource.optionalCompletion,
      localReadiness.optionalCompletion
    ),
    missingRequirements: missing,
    firstIncompleteStep,
  };
  const rawDestination = nonEmptyString(source.destination);
  const serverDestination = stepArray(rawDestination ? [rawDestination] : [])[0] ?? rawDestination;
  const destination =
    !accountVerified || isVerificationStep(serverDestination)
      ? firstIncompleteStep
      : serverDestination;
  return {
    schemaVersion: finiteNumber(source.schemaVersion) ?? snapshot.schemaVersion,
    snapshot,
    readiness,
    destination: destination ?? firstIncompleteStep,
  };
}

const DRAFT_PREFIX = 'crush:onboarding:v2:';

export function onboardingDraftStorageKey(uid: string): string {
  return `${DRAFT_PREFIX}${uid}`;
}

export function loadOnboardingDraft(uid: string): CanonicalOnboardingSnapshot | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(onboardingDraftStorageKey(uid));
    return raw ? normalizeOnboardingSnapshot(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

export function saveOnboardingDraft(uid: string, snapshot: CanonicalOnboardingSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(onboardingDraftStorageKey(uid), JSON.stringify(snapshot));
  } catch (error) {
    console.warn('Could not persist onboarding draft:', error);
  }
}

export function clearOnboardingDraft(uid: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(onboardingDraftStorageKey(uid));
  } catch (error) {
    console.warn('Could not clear onboarding draft:', error);
  }
}

function mapServiceError(error: unknown, fallback: string): OnboardingServiceError {
  if (error instanceof OnboardingServiceError) return error;
  const source = asRecord(error);
  const rawCode = nonEmptyString(source.code) ?? 'unknown';
  const code = rawCode.replace(/^functions\//, '');
  const retryable = [
    'unavailable',
    'deadline-exceeded',
    'resource-exhausted',
    'internal',
    'unknown',
  ].includes(code);
  const messages: Record<string, string> = {
    unauthenticated: 'Your session expired. Sign in and try again.',
    'permission-denied': 'This profile update was not authorized.',
    'failed-precondition': nonEmptyString(source.message) ?? fallback,
    'already-exists': 'That username is already taken.',
    'invalid-argument': nonEmptyString(source.message) ?? 'Check the information and try again.',
    unavailable:
      'The onboarding service is temporarily unavailable. Your draft is safe; please retry.',
    'resource-exhausted': 'Too many requests. Wait a moment and try again.',
  };
  return new OnboardingServiceError(
    code,
    messages[code] ?? nonEmptyString(source.message) ?? fallback,
    retryable,
    error
  );
}

class OnboardingService {
  async resolve(authFacts: AuthVerificationFacts): Promise<OnboardingResolution> {
    try {
      return normalizeOnboardingResolution(await callables.resolveOnboardingState({}), authFacts);
    } catch (error) {
      throw mapServiceError(error, 'Could not load onboarding progress.');
    }
  }

  async saveStep(
    stepKey: OnboardingStepKey,
    data: Record<string, unknown>,
    authFacts: AuthVerificationFacts,
    skipped = false
  ): Promise<OnboardingResolution> {
    try {
      const response = await callables.saveOnboardingStep({
        stepKey,
        data,
        ...(skipped ? { skipped: true } : {}),
      });
      return normalizeOnboardingResolution(response, authFacts);
    } catch (error) {
      throw mapServiceError(error, `Could not save ${stepKey}.`);
    }
  }

  async claimUsername(username: string): Promise<void> {
    try {
      await callables.claimUsername({ username: username.trim() });
    } catch (error) {
      throw mapServiceError(error, 'Could not save that username.');
    }
  }

  async checkUsernameAvailability(
    username: string
  ): Promise<{ available: boolean; normalized: string }> {
    try {
      const response = await callables.checkUsernameAvailability({ username: username.trim() });
      return {
        available: response.available === true,
        normalized: nonEmptyString(response.normalized) ?? username.trim().toLowerCase(),
      };
    } catch (error) {
      throw mapServiceError(error, 'Could not check username availability.');
    }
  }

  async confirmCurrentLocation(
    location: {
      latitude: number;
      longitude: number;
      accuracyMeters?: number;
      capturedAt: string;
      city?: string;
      region?: string;
      country?: string;
    },
    authFacts: AuthVerificationFacts
  ): Promise<OnboardingResolution> {
    try {
      return normalizeOnboardingResolution(
        await callables.confirmCurrentLocation(location),
        authFacts
      );
    } catch (error) {
      throw mapServiceError(error, 'Could not confirm your current location.');
    }
  }

  async validateProfilePhoto(input: {
    storagePath: string;
    downloadUrl?: string;
    isPrimary?: boolean;
  }): Promise<ValidateProfilePhotoResult> {
    try {
      const raw = asRecord(await callables.validateProfilePhoto(input));
      const statusText = nonEmptyString(raw.status)?.toLowerCase() as
        | OnboardingPhotoStatus
        | undefined;
      const snapshot = raw.snapshot ? normalizeOnboardingSnapshot(raw.snapshot) : undefined;
      const approvedPhoto = snapshot?.photos.find(
        (photo) => photo.mediaId === nonEmptyString(raw.mediaId)
      );
      return {
        schemaVersion: finiteNumber(raw.schemaVersion) ?? ONBOARDING_SCHEMA_VERSION,
        mediaId: nonEmptyString(raw.mediaId) ?? '',
        status: statusText && VALID_PHOTO_STATUSES.has(statusText) ? statusText : 'processing',
        reason: nonEmptyString(raw.reason),
        downloadUrl: approvedPhoto?.downloadUrl,
        snapshot,
      };
    } catch (error) {
      throw mapServiceError(error, 'Could not validate that profile photo.');
    }
  }

  async complete(authFacts: AuthVerificationFacts): Promise<OnboardingResolution> {
    try {
      return normalizeOnboardingResolution(await callables.completeOnboarding({}), authFacts);
    } catch (error) {
      throw mapServiceError(error, 'Your profile still has required items to complete.');
    }
  }
}

export const onboardingService = new OnboardingService();
