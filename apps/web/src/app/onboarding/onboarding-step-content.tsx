'use client';

import {
  MAX_ONBOARDING_INTERESTS,
  MIN_ONBOARDING_BIO_LENGTH,
  MIN_ONBOARDING_INTERESTS,
  ONBOARDING_INTEREST_OPTIONS,
  PROFILE_PHOTO_MAX_DIMENSION_PX,
  PROFILE_PHOTO_MIN_DIMENSION_PX,
  calculateCalendarAge,
  latestAllowedAdultBirthDate,
  type CanonicalOnboardingSnapshot,
  type Gender,
  type OnboardingReadiness,
  type OnboardingStepKey,
  type SexualOrientation,
} from '@crush/core';
import { Card, cn, Input, Textarea } from '@crush/ui';
import {
  Briefcase,
  Camera,
  Check,
  ExternalLink,
  FileText,
  Heart,
  Loader2,
  MapPin,
  Shield,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';

const GENDERS: readonly { value: Gender; label: string }[] = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
];

const ORIENTATIONS: readonly { value: SexualOrientation; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'asexual', label: 'Asexual' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const FAVOURITES = [
  ['athlete', 'Athlete'],
  ['food', 'Food'],
  ['sport', 'Sport'],
  ['tvShow', 'TV show'],
  ['actor', 'Actor'],
  ['singer', 'Singer'],
  ['movie', 'Movie'],
  ['hobby', 'Hobby'],
] as const;

function photoStatusMessage(status: string, reason?: string): string {
  if (status === 'approved') return 'Approved';
  if (status === 'processing' || status === 'uploading') return 'Checking photo…';
  if (reason === 'person_not_detected') {
    return 'We couldn’t detect a clear person. Choose a well-lit photo where your face is visible.';
  }
  if (status === 'failed') return 'Photo check failed. Please retry with another photo.';
  return 'This photo could not be approved. Please choose another clear photo of yourself.';
}

interface OnboardingStepContentProps {
  stepKey: OnboardingStepKey;
  snapshot: CanonicalOnboardingSnapshot;
  readiness: OnboardingReadiness;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  uploadingPhoto: boolean;
  maxPhotos: number;
  locating: boolean;
  usernameAvailability: 'idle' | 'checking' | 'available' | 'taken' | 'error';
  onChange: (patch: Partial<CanonicalOnboardingSnapshot>) => void;
  onTermsAccepted: (accepted: boolean) => void;
  onPrivacyAccepted: (accepted: boolean) => void;
  onPhotoUpload: (file?: File) => void;
  onCaptureLocation: () => void;
}

function StepHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof User;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function SelectionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl px-3 py-3 text-sm font-medium transition-all',
        selected
          ? 'bg-primary text-white shadow-lg shadow-primary/20'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      )}
    >
      {children}
    </button>
  );
}

export function OnboardingStepContent({
  stepKey,
  snapshot,
  readiness,
  termsAccepted,
  privacyAccepted,
  uploadingPhoto,
  maxPhotos,
  locating,
  usernameAvailability,
  onChange,
  onTermsAccepted,
  onPrivacyAccepted,
  onPhotoUpload,
  onCaptureLocation,
}: OnboardingStepContentProps) {
  switch (stepKey) {
    case 'terms':
      return (
        <div className="py-8">
          <StepHeading
            icon={FileText}
            title="Terms & safety"
            description="Review our commitments before creating your dating profile."
          />
          <Card className="space-y-6 p-6">
            <div className="rounded-xl bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                <div>
                  <h2 className="mb-1 font-semibold text-gray-900 dark:text-white">
                    Our Safety Commitment
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Crush is a respectful, adults-only community. Harassment, hate speech,
                    impersonation, and inappropriate content are not tolerated.
                  </p>
                </div>
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                Terms of Service highlights
              </h3>
              <ul className="list-disc space-y-2 pl-4">
                <li>You must be at least 18 years old and legally eligible to use Crush.</li>
                <li>Treat people respectfully and follow the Community Guidelines.</li>
                <li>
                  Use truthful account information; impersonation and fake accounts are prohibited.
                </li>
                <li>Use care when meeting offline and report unsafe behavior.</li>
                <li>Only upload content you are allowed to share.</li>
                <li>Accounts that violate these rules may be suspended or removed.</li>
              </ul>
            </div>
            <ConsentRow checked={termsAccepted} onChange={onTermsAccepted}>
              I agree to the{' '}
              <Link
                href="/terms"
                target="_blank"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Terms of Service <ExternalLink className="h-3 w-3" />
              </Link>{' '}
              and confirm I am at least 18.
            </ConsentRow>
            <ConsentRow checked={privacyAccepted} onChange={onPrivacyAccepted}>
              I have read and agree to the{' '}
              <Link
                href="/privacy"
                target="_blank"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Privacy Policy <ExternalLink className="h-3 w-3" />
              </Link>
              .
            </ConsentRow>
            <p className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500 dark:border-gray-700">
              Continuing also means you agree to the{' '}
              <Link
                href="/terms#community-guidelines"
                target="_blank"
                className="text-primary hover:underline"
              >
                Community Guidelines
              </Link>
              .
            </p>
          </Card>
        </div>
      );

    case 'username':
      return (
        <div className="py-8">
          <StepHeading
            icon={User}
            title="Choose your username"
            description="This is unique to you and can be changed later only when allowed."
          />
          <Card className="space-y-3 p-6">
            <label htmlFor="onboarding-username" className="text-sm font-medium">
              Username
            </label>
            <Input
              id="onboarding-username"
              autoCapitalize="none"
              autoCorrect="off"
              value={snapshot.username}
              onChange={(event) => onChange({ username: event.target.value.replace(/\s/g, '') })}
              placeholder="e.g., ace"
              minLength={3}
              maxLength={20}
            />
            <p className="text-xs text-gray-500">
              3–20 letters, numbers, or underscores. Availability is confirmed securely when you
              continue.
            </p>
            {usernameAvailability !== 'idle' && (
              <p
                className={cn(
                  'text-sm font-medium',
                  usernameAvailability === 'available' && 'text-emerald-600',
                  (usernameAvailability === 'taken' || usernameAvailability === 'error') &&
                    'text-red-600',
                  usernameAvailability === 'checking' && 'text-gray-500'
                )}
              >
                {usernameAvailability === 'checking'
                  ? 'Checking availability…'
                  : usernameAvailability === 'available'
                    ? 'Username is available.'
                    : usernameAvailability === 'taken'
                      ? 'That username is already taken.'
                      : 'Could not check availability. Edit the username or retry.'}
              </p>
            )}
          </Card>
        </div>
      );

    case 'basicInfo':
      return (
        <div className="py-8">
          <StepHeading
            icon={User}
            title="Basic information"
            description="Your username is already saved, so we only need the essentials here."
          />
          <Card className="space-y-6 p-6">
            <div>
              <label htmlFor="onboarding-first-name" className="mb-2 block text-sm font-medium">
                First name
              </label>
              <Input
                id="onboarding-first-name"
                value={snapshot.firstName}
                onChange={(event) => onChange({ firstName: event.target.value })}
                placeholder="Your first name"
                maxLength={50}
              />
            </div>
            <div>
              <label htmlFor="onboarding-last-name" className="mb-2 block text-sm font-medium">
                Last name <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <Input
                id="onboarding-last-name"
                value={snapshot.lastName}
                onChange={(event) => onChange({ lastName: event.target.value })}
                placeholder="Your last name"
                maxLength={50}
              />
            </div>
            <div>
              <label htmlFor="onboarding-birth-date" className="mb-2 block text-sm font-medium">
                Date of birth
              </label>
              <Input
                id="onboarding-birth-date"
                type="date"
                value={snapshot.birthDate}
                onChange={(event) => onChange({ birthDate: event.target.value })}
                max={latestAllowedAdultBirthDate()}
              />
              <p className="mt-1 text-xs text-gray-500">
                You must be 18+. Once saved, date-of-birth changes are protected by the server
                cooldown.
                {snapshot.birthDate && calculateCalendarAge(snapshot.birthDate) !== undefined
                  ? ` Current age: ${calculateCalendarAge(snapshot.birthDate)}.`
                  : ''}
              </p>
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium">Gender</span>
              <div className="grid grid-cols-2 gap-3">
                {GENDERS.map((option) => (
                  <SelectionButton
                    key={option.value}
                    selected={snapshot.gender === option.value}
                    onClick={() =>
                      onChange({
                        gender: option.value,
                        ...(option.value !== 'non_binary' ? { sexualOrientation: null } : {}),
                      })
                    }
                  >
                    {option.label}
                  </SelectionButton>
                ))}
              </div>
            </div>
            {snapshot.gender === 'non_binary' && (
              <div>
                <span className="mb-2 block text-sm font-medium">
                  Sexual orientation <span className="font-normal text-gray-500">(optional)</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {ORIENTATIONS.map((option) => (
                    <SelectionButton
                      key={option.value}
                      selected={snapshot.sexualOrientation === option.value}
                      onClick={() => onChange({ sexualOrientation: option.value })}
                    >
                      {option.label}
                    </SelectionButton>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      );

    case 'discoveryPreferences':
      return (
        <div className="py-8">
          <StepHeading
            icon={Users}
            title="Discovery preferences"
            description="Optional — choose who you would like to meet. You can update this later."
          />
          <Card className="space-y-4 p-6">
            <span className="block text-sm font-medium">I’m interested in…</span>
            <div className="grid grid-cols-2 gap-3">
              {GENDERS.map((option) => {
                const selected = snapshot.interestedIn.includes(option.value);
                return (
                  <SelectionButton
                    key={option.value}
                    selected={selected}
                    onClick={() =>
                      onChange({
                        interestedIn: selected
                          ? snapshot.interestedIn.filter((gender) => gender !== option.value)
                          : [...snapshot.interestedIn, option.value],
                      })
                    }
                  >
                    {option.value === 'male'
                      ? 'Men'
                      : option.value === 'female'
                        ? 'Women'
                        : option.label}
                  </SelectionButton>
                );
              })}
              <SelectionButton
                selected={snapshot.interestedIn.length === GENDERS.length}
                onClick={() => onChange({ interestedIn: GENDERS.map((option) => option.value) })}
              >
                Everyone
              </SelectionButton>
            </div>
            <p className="text-xs text-gray-500">
              Preferences are private and are used only to build your discovery deck.
            </p>
          </Card>
        </div>
      );

    case 'photos':
      return (
        <div className="py-8">
          <StepHeading
            icon={Camera}
            title="Add a clear photo"
            description="Add at least one clear photo of yourself. Photos of objects, scenery, text, logos, or empty rooms cannot be your required profile photo."
          />
          <Card className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-3">
              {snapshot.photos.map((photo) => (
                <div
                  key={photo.mediaId ?? photo.storagePath ?? photo.downloadUrl}
                  className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  {photo.downloadUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photo.downloadUrl}
                      alt="Profile candidate"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-gray-100 text-gray-400 dark:bg-gray-800">
                      <Camera className="h-8 w-8" />
                    </div>
                  )}
                  <p
                    className={cn(
                      'px-3 py-2 text-xs font-medium capitalize',
                      photo.status === 'approved' && 'text-emerald-600',
                      (photo.status === 'rejected' || photo.status === 'failed') && 'text-red-600',
                      (photo.status === 'processing' || photo.status === 'uploading') &&
                        'text-amber-600'
                    )}
                  >
                    {photoStatusMessage(photo.status, photo.reason)}
                  </p>
                </div>
              ))}
            </div>
            <label
              className={cn(
                'flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 p-5 text-sm font-medium text-primary hover:bg-primary/5',
                (uploadingPhoto || snapshot.photos.length >= maxPhotos) &&
                  'pointer-events-none opacity-60'
              )}
            >
              {uploadingPhoto ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
              {uploadingPhoto
                ? 'Uploading and checking…'
                : snapshot.photos.length >= maxPhotos
                  ? `Photo limit reached (${maxPhotos})`
                  : 'Choose photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="sr-only"
                onChange={(event) => onPhotoUpload(event.target.files?.[0])}
                disabled={uploadingPhoto || snapshot.photos.length >= maxPhotos}
              />
            </label>
            <p className="text-xs text-gray-500">
              JPEG, PNG, WebP, HEIC, or HEIF; {PROFILE_PHOTO_MIN_DIMENSION_PX}–
              {PROFILE_PHOTO_MAX_DIMENSION_PX}px per side; maximum 10 MB. Uploading does not approve
              a photo. Crush’s server records the final status; rejected photos never satisfy
              readiness.
            </p>
          </Card>
        </div>
      );

    case 'aboutMe':
      return (
        <div className="py-8">
          <StepHeading
            icon={Heart}
            title="About you"
            description="A short, genuine bio gives people an easy conversation starter."
          />
          <Card className="space-y-3 p-6">
            <label htmlFor="onboarding-bio" className="text-sm font-medium">
              Bio
            </label>
            <Textarea
              id="onboarding-bio"
              value={snapshot.bio}
              onChange={(event) => onChange({ bio: event.target.value })}
              placeholder="Tell people a little about yourself…"
              rows={6}
              maxLength={500}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Minimum {MIN_ONBOARDING_BIO_LENGTH} characters</span>
              <span>{snapshot.bio.length}/500</span>
            </div>
          </Card>
        </div>
      );

    case 'location':
      return (
        <div className="py-8">
          <StepHeading
            icon={MapPin}
            title="Confirm your location"
            description="Current GPS location is required for safe, accurate nearby discovery."
          />
          <Card className="space-y-4 p-6">
            {snapshot.location?.confirmedAt ? (
              <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Check className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Location confirmed</p>
                  <p className="text-sm">
                    {[snapshot.location.city, snapshot.location.region, snapshot.location.country]
                      .filter(Boolean)
                      .join(', ') || 'Coordinates securely captured'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Manual city or country text does not satisfy this step. Your browser will ask for
                location permission.
              </p>
            )}
            <button
              type="button"
              onClick={onCaptureLocation}
              disabled={locating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-white disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MapPin className="h-5 w-5" />
              )}
              {locating
                ? 'Capturing and confirming…'
                : snapshot.location?.confirmedAt
                  ? 'Refresh current location'
                  : 'Use and confirm current location'}
            </button>
            <p className="text-xs text-gray-500">
              Your exact coordinates are retained for protected discovery calculations and are not
              displayed on your public profile.
            </p>
          </Card>
        </div>
      );

    case 'workEducation':
      return (
        <div className="py-8">
          <StepHeading
            icon={Briefcase}
            title="Work & education"
            description="Optional details that help people understand your day-to-day life."
          />
          <Card className="space-y-4 p-6">
            <Field
              label="Job title"
              value={snapshot.workEducation.jobTitle ?? ''}
              placeholder="e.g., Product designer"
              onChange={(jobTitle) =>
                onChange({ workEducation: { ...snapshot.workEducation, jobTitle } })
              }
            />
            <Field
              label="Company"
              value={snapshot.workEducation.company ?? ''}
              placeholder="Where you work"
              onChange={(company) =>
                onChange({ workEducation: { ...snapshot.workEducation, company } })
              }
            />
            <Field
              label="School"
              value={snapshot.workEducation.school ?? ''}
              placeholder="School or university"
              onChange={(school) =>
                onChange({ workEducation: { ...snapshot.workEducation, school } })
              }
            />
          </Card>
        </div>
      );

    case 'interests':
      return (
        <div className="py-8">
          <StepHeading
            icon={Sparkles}
            title="Your interests"
            description={`Choose ${MIN_ONBOARDING_INTERESTS}–${MAX_ONBOARDING_INTERESTS} things you genuinely enjoy.`}
          />
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Stable interest IDs keep your choices consistent across devices.
              </span>
              <span className="font-medium text-primary">
                {snapshot.interests.length}/{MAX_ONBOARDING_INTERESTS}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_INTEREST_OPTIONS.map(([id, label]) => {
                const selected = snapshot.interests.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      onChange({
                        interests: selected
                          ? snapshot.interests.filter((interest) => interest !== id)
                          : snapshot.interests.length < MAX_ONBOARDING_INTERESTS
                            ? [...snapshot.interests, id]
                            : snapshot.interests,
                      })
                    }
                    className={cn(
                      'rounded-full px-3 py-2 text-sm font-medium',
                      selected
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      );

    case 'favourites':
      return (
        <div className="py-8">
          <StepHeading
            icon={Heart}
            title="A few favourites"
            description="Optional answers that make your profile more personal."
          />
          <Card className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            {FAVOURITES.map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={snapshot.favourites[key] ?? ''}
                placeholder={`Favourite ${label.toLowerCase()}`}
                onChange={(value) =>
                  onChange({ favourites: { ...snapshot.favourites, [key]: value } })
                }
              />
            ))}
          </Card>
        </div>
      );

    case 'ready':
      return (
        <div className="py-8">
          <StepHeading
            icon={Check}
            title="Ready for discovery?"
            description="Crush checks the real server facts before matching is enabled."
          />
          <Card className="space-y-5 p-6">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Required" value={readiness.requiredCompletion.percent} />
              <Metric label="Optional" value={readiness.optionalCompletion.percent} />
            </div>
            {readiness.missingRequirements.length > 0 ? (
              <div>
                <h2 className="mb-2 font-semibold">Still required</h2>
                <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
                  {readiness.missingRequirements.map((missing) => (
                    <li
                      key={missing.code}
                      className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30"
                    >
                      {missing.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                Your required profile is complete. The server will perform one final authorization
                check.
              </div>
            )}
          </Card>
        </div>
      );

    default:
      return null;
  }
}

function ConsentRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <span>{children}</span>
    </label>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = `onboarding-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={80}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 text-center dark:bg-gray-800">
      <p className="text-2xl font-bold text-primary">{value}%</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
