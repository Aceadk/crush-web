# Crush Web – Engineering Log

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
