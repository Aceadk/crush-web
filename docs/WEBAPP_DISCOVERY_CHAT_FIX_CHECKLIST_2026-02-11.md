# Web App Discovery + Chat Fix Checklist (2026-02-11)

## Scope
- Routes: `/discover`, `/messages`, `/messages/[matchId]`, `/messages/requests`
- Stores/services: `matchService`, `messageService`, `useMatchStore`, `useMessageStore`

## Completed in this pass
- [x] Prevent split chat threads caused by directional `matchId` values by resolving existing conversations using both forward/reverse ids.
- [x] Normalize participants when creating conversations to reduce duplicate conversation risk.
- [x] Fix messages list route mapping so conversation cards resolve user match data by participant fallback when direct `matchId` lookup fails.
- [x] Fix chat-room direct route behavior to load matches before deciding `Match not found`.
- [x] Add reverse `matchId` fallback in chat-room match resolution for old links.
- [x] Replace blocking `alert()` calls in chat-room actions with toast-based UX for report/upload/voice/action failures.
- [x] Surface message-store errors in chat-room with toasts and clear error state.
- [x] Improve infinite-scroll trigger (`scrollTop <= 20`) and preserve viewport when loading older messages.
- [x] Improve auto-scroll behavior to avoid jump-to-bottom during pagination while still following new messages near bottom.
- [x] Ensure typing indicator timeout cleanup and reset on chat unmount.
- [x] Enforce discovery filters for:
  - [x] age (including `birthDate` fallback when stored `age` is missing/stale)
  - [x] `hasPhotos`
  - [x] `isVerified`
  - [x] `maxDistance` (when distance data exists)

## Verification run
- [x] `pnpm -C packages/core typecheck`
- [x] `pnpm -C apps/web build` (Next 16 build + TS phase passed)
- [x] Playwright route smoke tests (chromium):
  - [x] unauthenticated `/discover` redirects to login
  - [x] unauthenticated `/messages` redirects to login

## Still open (high priority)
- [ ] Add authenticated E2E for full discovery->match->chat flow:
  - [ ] swipe right to create match
  - [ ] open `/messages`
  - [ ] open `/messages/[matchId]`
  - [ ] send/receive text
  - [ ] send image and voice note
  - [ ] verify reactions/edit/unsend behavior
- [ ] Validate Firestore indexes/rules for all production queries used in discovery/chat (especially `in` match query and message-request queries).
- [ ] Add backend-safe canonical conversation key strategy (e.g., sorted participant key) to fully remove directional id ambiguity long-term.

## Still open (medium priority)
- [ ] Split `useMatchStore.loading` into distinct loading flags (`loadingMatches`, `loadingDiscovery`) to avoid cross-screen spinner side effects.
- [ ] Add user-facing error states in `/messages/requests` accept/decline actions (currently console-only on failure).
- [ ] Add telemetry/logging for key failures (`openConversation`, `sendMessage`, `swipe`) for production diagnosis.
- [ ] Add resilience for profiles with missing/invalid media URLs (image fallback + retry strategy).

## Tooling debt blocking stricter CI
- [ ] Fix lint script for Next 16 (`next lint` deprecated behavior in this setup).
- [ ] Fix TypeScript error in `apps/web/e2e/auth.spec.ts` (`checkValidity` typed on union including `SVGElement`) so full app typecheck passes cleanly in CI.
