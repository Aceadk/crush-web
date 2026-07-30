'use client';

const USERNAME_MAX_LENGTH = 32;
const FULL_NAME_MAX_LENGTH = 80;

export interface WatermarkAuthUser {
  uid: string;
  displayName?: string | null;
}

export interface WatermarkProfile {
  id: string;
  username?: string;
  displayName?: string;
  lastName?: string;
}

export interface ViewerWatermarkIdentity {
  username: string;
  fullName: string;
  label: string;
}

function normalizeVisibleText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';

  return value
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim();
}

function normalizeUsername(value: unknown): string {
  const username = normalizeVisibleText(value, USERNAME_MAX_LENGTH).replace(/^@+/, '');
  return username.includes('@') ? '' : username;
}

function normalizeFullName(value: unknown): string {
  const fullName = normalizeVisibleText(value, FULL_NAME_MAX_LENGTH);
  return fullName.includes('@') ? '' : fullName;
}

function fallbackUsername(uid: string): string {
  const traceToken = uid
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 8);

  return `member-${traceToken || 'viewer'}`;
}

function buildCanonicalFullName(
  displayNameValue: unknown,
  lastNameValue: unknown,
  fallbackDisplayName: unknown
): string {
  const displayName =
    normalizeFullName(displayNameValue) || normalizeFullName(fallbackDisplayName);
  const lastName = normalizeFullName(lastNameValue);

  if (!displayName) return 'Crush member';
  if (!lastName) return displayName;

  const displayNameLower = displayName.toLocaleLowerCase();
  const lastNameLower = lastName.toLocaleLowerCase();
  const alreadyIncludesLastName =
    displayNameLower === lastNameLower || displayNameLower.endsWith(` ${lastNameLower}`);

  if (alreadyIncludesLastName) return displayName;

  return normalizeVisibleText(`${displayName} ${lastName}`, FULL_NAME_MAX_LENGTH);
}

/**
 * Resolves the signed-in viewer identity used to trace captured web content.
 *
 * A profile is trusted only when it belongs to the current Firebase user. The
 * auth store intentionally updates `user` before the next profile finishes
 * loading, so this guard prevents a previous account's identity appearing
 * during a fast account switch.
 */
export function buildViewerWatermarkIdentity(
  user: WatermarkAuthUser | null | undefined,
  profile: WatermarkProfile | null | undefined
): ViewerWatermarkIdentity | null {
  if (!user) return null;

  const currentProfile = profile?.id === user.uid ? profile : null;
  const username =
    normalizeUsername(currentProfile?.username) || fallbackUsername(normalizeVisibleText(user.uid, 128));
  const fullName = buildCanonicalFullName(
    currentProfile?.displayName,
    currentProfile?.lastName,
    user.displayName
  );

  return {
    username,
    fullName,
    label: `@${username} • ${fullName} • CRUSH`,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * A percent-encoded SVG keeps the viewport overlay to one inert DOM node while
 * the browser repeats the trace label across every captured pixel.
 */
export function createWatermarkDataUrl(identity: ViewerWatermarkIdentity): string {
  const safeLabel = escapeXml(identity.label);
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="168" viewBox="0 0 420 168">',
    '<g transform="rotate(-22 210 84)">',
    '<text x="38" y="78" textLength="344" lengthAdjust="spacingAndGlyphs"',
    ' font-family="system-ui,-apple-system,BlinkMacSystemFont,sans-serif"',
    ' font-size="17" font-weight="700" letter-spacing="0.6"',
    ' fill="#FF3F7F" stroke="#160810" stroke-width="0.8" paint-order="stroke"',
    ` opacity="0.92">${safeLabel}</text>`,
    '<text x="38" y="101" textLength="210" lengthAdjust="spacingAndGlyphs"',
    ' font-family="system-ui,-apple-system,BlinkMacSystemFont,sans-serif"',
    ' font-size="10" font-weight="700" letter-spacing="1.5"',
    ' fill="#FFFFFF" stroke="#160810" stroke-width="0.6" paint-order="stroke"',
    ' opacity="0.84">CRUSH • VIEWER WATERMARK</text>',
    '</g>',
    '</svg>',
  ].join('');

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Viewer trace overlay for **captures that the browser can actually tell us
 * about** — printing and print-to-PDF. Hidden on screen.
 *
 * Why it is not shown while browsing: a full-viewport overlay at a visible
 * opacity sat on top of every authenticated screen and wrecked the UI. It was
 * there because a watermark can only appear in a screenshot if it is already
 * painted — and the web has **no screenshot detection API** (nothing fires for
 * macOS Cmd+Shift+4, Snipping Tool, browser extensions, or a phone camera), so
 * "show it only during a screenshot" is not expressible. Print is the one
 * capture path with real events (`@media print`), so that is where a
 * full-strength overlay belongs.
 *
 * Screenshot traceability is instead handled inside `ProtectedImage`, which
 * keeps a deliberately imperceptible watermark burned over the media itself —
 * present in a capture, invisible in normal use.
 */
export function SensitiveContentWatermark({
  identity,
}: {
  identity: ViewerWatermarkIdentity | null;
}) {
  if (!identity) return null;

  const dataUrl = createWatermarkDataUrl(identity);

  return (
    <div
      aria-hidden="true"
      // `hidden print:block` is the whole fix: absent from the on-screen layout
      // (not merely transparent, so it cannot tint or intercept anything), and
      // painted at full strength on a printed page or PDF export.
      className="pointer-events-none fixed inset-0 z-[2147483646] hidden select-none print:block"
      data-testid="viewer-watermark"
      style={{
        backgroundImage: `url("${dataUrl}")`,
        backgroundPosition: 'center',
        backgroundRepeat: 'repeat',
        backgroundSize: '420px 168px',
        opacity: 0.35,
        // Keep the trace legible if the browser strips backgrounds when
        // printing.
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    />
  );
}
