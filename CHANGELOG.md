# Crush Web – Engineering Log

## 2026-01-28 — Phase 0/1: Initial Scan + Blank Page Triage (WIP)

**Milestone:** Phase 0 – Repo scan & architecture map; Phase 1 – blank page triage  
**What changed:** Removed persisted auth `initialized` flag so auth listener always reattaches on reload.  
**Why:** Persisting `initialized` prevented `initialize()` from running after reload, leaving `user` null while middleware still saw an auth cookie. That can cause redirect loops or blank screens on protected routes.  
**Files touched:** `packages/core/src/stores/auth.ts`  
**How verified:** Not run yet (needs local dev repro + browser console/network capture).  
**Notes:** This is a minimal fix aimed at the most likely root cause of blank pages during direct URL entry/refresh.  
**Next steps:** Reproduce in browser, confirm redirect loop is resolved, and capture console/network logs.
