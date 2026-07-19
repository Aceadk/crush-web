# Crush Web – Engineering Log

## 2026-07-18 — Cross-platform alignment with the mobile app

**Milestone:** App↔Web data-contract alignment (from the 2026-07-18 audit)
**What changed:**
- **Media-safe chat previews (ALIGN-2):** new `messagePreview()` (mirrors the mobile `messagePreviewText`) turns media last-messages into "Photo"/"Voice message"/"GIF" and masks ciphertext/bare URLs. Wired into `match_v2.mapDocToMatch` and `message_v2_adapter.getConversations` (the latter previously never set a preview). `Match` gained `lastMessageType`/`lastMessageFromUserId`.
- **Username-first discovery (ALIGN-4):** the deck card now renders `@handle` via `discoveryDisplayName()` (falls back to the privacy-gated name). Depends on the backend REST `/v1/discovery/deck` now emitting `username`.
- **Unified privacy (ALIGN-1):** privacy toggles now mirror into the canonical `profile.privacySettings.*` (`privacySchemaVersion: 2`) — the location the backend and mobile read — so a web privacy choice finally takes effect off-web; `showOnlineStatus` is read back from there too.
- **Presence (ALIGN-3):** new `presenceService` mirroring the mobile contract (`presence/{uid}`={isOnline,lastSeen}, 2-min freshness, 45s heartbeat, premium-gated reads, showOnlineStatus gate). `usePresenceHeartbeat` (app layout) makes web-active users appear online to mobile; `usePeerPresence` shows online dots in the conversation list.
- **Sound/vibration (ALIGN-6):** notification settings gained Sound + Vibration toggles writing `notificationPrefs.sound/.vibration`, which the backend reads per recipient.
**Files touched:**
- `packages/core/src/services/`: new `message_preview.ts`, `presence.ts`; edits to `match_v2.ts`, `message_v2_adapter.ts`, `discovery_rest.ts`, `user.ts`, `user_document.ts`, `notification.ts`; `types/match.ts`, `index.ts`
- `apps/web/src/`: `features/discover/components/swipe-card.tsx`, `app/(app)/messages/page.tsx`, `app/(app)/layout.tsx`, `app/(app)/settings/notifications/page.tsx`, new `shared/hooks/use-presence.ts`
- New tests: `apps/web/src/lib/__tests__/cross-platform-alignment.test.ts` (12); updated `notification-prefs-schema.test.ts`
**Why:** Both apps share one Firestore DB with independent backends; a week of mobile changes had pulled six data contracts out of sync (see the alignment audit).
**How verified:** Web 346 tests pass (was 333), core lint clean (`--max-warnings=0`), core + web typecheck clean. Backend `tsc` clean (the paired REST username change lives in the app repo's `functions/src/index.ts`).
**Notes:** Requires the app repo's `firebase deploy --only functions` for the REST `username` field to go live (ALIGN-4).


## 2026-01-28 — Phase 0/1: Initial Scan + Blank Page Triage (WIP)

**Milestone:** Phase 0 – Repo scan & architecture map; Phase 1 – blank page triage  
**What changed:** Removed persisted auth `initialized` flag so auth listener always reattaches on reload.  
**Why:** Persisting `initialized` prevented `initialize()` from running after reload, leaving `user` null while middleware still saw an auth cookie. That can cause redirect loops or blank screens on protected routes.  
**Files touched:** `packages/core/src/stores/auth.ts`  
**How verified:** Not run yet (needs local dev repro + browser console/network capture).  
**Notes:** This is a minimal fix aimed at the most likely root cause of blank pages during direct URL entry/refresh.  
**Next steps:** Reproduce in browser, confirm redirect loop is resolved, and capture console/network logs.

## 2026-01-29 — Phase 1: Auth Guard + Middleware Coverage

**Milestone:** Phase 1 – blank page triage & guard hardening  
**What changed:**  
- Added an auth-safe loading/redirect shell for protected routes.  
- Expanded middleware coverage to include all protected app routes and `/auth/forgot-password`.  
- Synced local Firebase env values into `apps/web/.env.local` (gitignored).  
**Why:**  
- Prevent “blank” or empty UI during auth initialization/redirects.  
- Ensure all protected routes are consistently guarded.  
- Enable real auth flows during local repro.  
**Files touched:**  
- `apps/web/src/shared/components/layout/auth-shell.tsx`  
- `apps/web/src/app/(app)/layout.tsx`  
- `apps/web/src/middleware.ts`  
- `apps/web/.env.local` (local only, not committed)  
**How verified:** Dev server started; navigation attempted; Turbopack cache corruption triggered 500s and was auto-cleared by Next. Repro requires valid auth session.  
**Next steps:** Reproduce blank pages with a valid user session and capture console/network logs.
