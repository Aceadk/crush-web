# AGENTS — crush-web

`crush-web` is the **Next.js web app** half of a two-repository product:

| Repo | Role |
|------|------|
| [`my_first_project`](../my_first_project) | Flutter mobile/iPad app **and the Firebase backend** (Cloud Functions, Firestore rules, Storage) — the **source of truth** for all backend contracts and data schema. |
| `crush-web` (this repo) | Next.js web app + marketing site. Consumes the same Firebase backend. |

## Canonical workflow & tracking lives in `my_first_project/docs`

Do **not** create duplicate task boards or change logs here. All cross-repo
alignment work is tracked centrally:

- **Task log:** `my_first_project/docs/Developer_agent_chat.md`
- **Workboard / status:** `my_first_project/docs/ai_workboard.md`

When you make a web change that is part of the alignment effort, record it in
those files (the same commit that touches web code, mirrored as a docs commit in
`my_first_project`).

## Alignment reference docs (read before changing backend-facing code)

All under `my_first_project/docs/reports/`:

- **`shared_backend_contract_matrix_2026-06-05.md`** — every Cloud Functions
  callable + REST endpoint + Firestore schema. **Verified against
  `functions/src/index.ts`.** This is the contract web must follow.
- **`domain_environment_matrix_2026-06-05.md`** — canonical domains, env config,
  CORS, Stripe URLs.
- **`route_deeplink_matrix_2026-06-05.md`** — mobile/web/notification route map.
- **`web_chat_match_migration_plan_2026-06-05.md`** — the chat/match V2 migration
  (Option B) and the Phase 1.5 data migration runbook.
- **`web_ci_upgrade_plan_2026-06-05.md`** — target CI pipeline for this repo.
- **`crush_web_mobile_alignment_plan_2026-06-03.md`** — the originating audit.

## Hard rules for web code

1. **Backend is the source of truth.** Mutations to `matches/`, `messages/`,
   and other backend-managed collections must go through Cloud Functions
   callables — direct Firestore writes are rejected by the security rules.
   Use the V2 services (`packages/core/src/services/{message_v2,match_v2}.ts`)
   and the typed `callables` in `packages/core/src/api/callables.ts`.
2. **Entitlement is derived from the canonical `plan` field** (`'free'|'plus'`),
   not legacy `isPremium`/`subscriptionTier`. Use
   `resolveEntitlement`/`isPremiumUser` (`packages/core/src/services/entitlement.ts`).
   Any subscription write must also set canonical `plan` + `subscriptionExpiresAt`.
3. **Notification routes** must resolve through `resolveNotificationRoute`
   (`packages/core/src/services/notification.ts`), which maps every backend
   `targetRoute`/`type` to a real web route per the route matrix.
4. **Brand** comes from `apps/web/src/lib/brand.ts` (primary `#FF3F7F`, dark
   `#0D0E12`, shared heart mark) — keep favicon/PWA/OG/manifest in sync.
5. **Auth errors** are presented via `getAuthErrorMessage`
   (`packages/core/src/services/auth_errors.ts`) — never surface raw Firebase
   strings.
6. **App Check is required for backend calls.** Production callable/REST paths
   enforce App Check. The web client initializes it in
   `packages/core/src/firebase/config.ts` (reCAPTCHA Enterprise by default).
   Firestore/callable SDKs attach the token automatically; **raw `fetch()` to
   Cloud Functions must attach it manually** via `getAppCheckHeaders()`
   (see `services/match.ts` discovery REST for the pattern).

## App Check behavior by environment

| | Provider | Site key | Debug token | Missing key |
|---|---|---|---|---|
| **Development** | Enterprise (or v3) | optional | honored (`NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN`, register in Firebase console) | warning |
| **Staging** | Enterprise | required | ignored | error (logged) |
| **Production** | Enterprise | required | ignored | error (logged) |

- Provider: `NEXT_PUBLIC_FIREBASE_APPCHECK_PROVIDER` (`recaptcha-enterprise`
  default, or `recaptcha-v3`). Environment resolved from `NEXT_PUBLIC_APP_ENV`
  (falls back to `NODE_ENV`).
- Token auto-refresh is on. `validateAppCheckEnv()` runs at init and logs
  errors (staging/prod) or warnings (dev). `getAppCheckToken()` logs
  missing/invalid/expired token conditions.
- A debug token set outside development is logged and **ignored** — it never
  weakens staging/production enforcement.

## CSP (Content-Security-Policy)

The policy is built in `apps/web/src/shared/lib/csp.ts` (`buildCspHeader`) and
applied in `middleware.ts`. It is environment-specific and must permit every
backend integration:

- `connect-src`: `*.cloudfunctions.net` (callables + discovery REST),
  `*.googleapis.com` (App Check, FCM registration, Storage),
  `firebasestorage.googleapis.com`, `api.stripe.com`, `*.firebaseio.com` +
  `wss:` (realtime), `www.google.com` (reCAPTCHA), and — once the domain
  decision lands — the canonical REST API origin via `NEXT_PUBLIC_API_ORIGIN`.
- `script-src`/`frame-src`: reCAPTCHA (`www.google.com`, `www.gstatic.com`) and
  Stripe (`js.stripe.com`, `hooks.stripe.com`).
- `worker-src 'self'`: the firebase-messaging web-push service worker.
- **Development only** additionally allows local emulator origins
  (`http://localhost:*`, `http://127.0.0.1:*`, `ws://…`) plus `unsafe-eval`/
  `unsafe-inline` for the webpack dev runtime. **Production/staging stay strict**
  (nonce-based script-src, no unsafe-*, no localhost).

When adding a new external backend, add its origin to the right directive AND a
regression test in `apps/web/src/lib/__tests__/csp.test.ts`.

## Local checks (run before committing)

```bash
pnpm --filter @crush/core typecheck   # or: cd packages/core && npx tsc --noEmit
pnpm --filter @crush/core lint
cd apps/web && npx tsc --noEmit        # web typecheck
cd apps/web && npx vitest run          # unit/contract tests
cd apps/web && npx eslint src/         # web lint
```

## Feature flags

- `NEXT_PUBLIC_USE_V2_CHAT` — routes the chat/match stores through the V2
  backend-aligned services. **Default OFF.** Flip per-environment only after the
  Phase 1.5 data migration (`apps/web/scripts/migrate-conversations-to-matches.mjs`)
  has run and been verified. See the migration plan.
