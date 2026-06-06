/**
 * Feature flags for the web app.
 *
 * These read NEXT_PUBLIC_* env vars (build-time constants in Next.js) so they
 * can be toggled per-environment without code changes.
 */

function readBooleanFlag(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on';
}

/**
 * When enabled, the chat/match stores route through the V2 backend-aligned
 * services (Cloud Functions callables + canonical matches/{matchId}/messages),
 * instead of the legacy conversations/-based direct-Firestore services.
 *
 * Default: OFF. Flip per-environment after the Phase 1.5 data migration has run
 * and been verified. See:
 * my_first_project/docs/reports/web_chat_match_migration_plan_2026-06-05.md.
 */
export function isV2ChatEnabled(): boolean {
  return readBooleanFlag(process.env.NEXT_PUBLIC_USE_V2_CHAT, false);
}
