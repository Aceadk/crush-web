# AI Tasks Board

## Completed Tasks

### T-001: Comprehensive Location Services Implementation
- **Owner AI:** Claude
- **Status:** Done
- **Goal:** Implement location toggle, permission handling, and display city/country names instead of coordinates
- **Scope:**
  - In: Location service, hooks, settings toggle, onboarding flow, profile display
  - Out: Backend distance calculations, real-time location tracking
- **Files Changed:**
  - packages/core/src/services/location.ts (new)
  - packages/core/src/index.ts (modified)
  - packages/core/src/types/user.ts (modified)
  - apps/web/src/hooks/use-location.ts (new)
  - apps/web/src/hooks/index.ts (modified)
  - apps/web/src/app/(app)/settings/settings-view.tsx (modified)
  - apps/web/src/app/onboarding/onboarding-flow.tsx (modified)
  - apps/web/src/app/(app)/profile/profile-view.tsx (modified)
  - apps/web/src/app/(app)/profile/preview/profile-preview.tsx (modified)
- **Verification:** Build passes, all pages compile successfully

## In Progress Tasks

None

## Pending Tasks

### T-002: Premium Geocoding API Integration (Future)
- **Owner AI:** TBD
- **Status:** Proposed
- **Goal:** Replace OpenStreetMap Nominatim with production-grade geocoding API
- **Priority:** Low (current solution works for MVP)

### T-003: Location-based Discovery Filtering
- **Owner AI:** TBD
- **Status:** Proposed
- **Goal:** Integrate location service with discovery/swipe to filter by distance
- **Priority:** Medium
