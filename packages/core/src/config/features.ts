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
 * Default: ON since the crush-f5352 clean start (2026-06-11). The new Firebase
 * project launches with no legacy data, and the deployed Firestore rules
 * reject the legacy direct-write paths, so V2 is the only path that works in
 * production. Set NEXT_PUBLIC_USE_V2_CHAT=false only for local debugging
 * against pre-migration data. The Phase 1.5 migration plan
 * (my_first_project/docs/reports/web_chat_match_migration_plan_2026-06-05.md)
 * is retained for history but is moot on the clean-start project.
 */
export function isV2ChatEnabled(): boolean {
  return readBooleanFlag(process.env.NEXT_PUBLIC_USE_V2_CHAT, true);
}
