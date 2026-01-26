# AI Change Log

## [2026-01-26] Task: Comprehensive Location Services Implementation

**Summary:**
Implemented full location services across the CRUSH web app with:
- Location toggle (on/off) functionality
- Browser permission request handling
- Reverse geocoding to show city/country instead of coordinates
- Location never displays latitude/longitude to users

**Files Added:**
- `packages/core/src/services/location.ts` - Core location service with reverse geocoding using OpenStreetMap Nominatim API
- `apps/web/src/hooks/use-location.ts` - React hook for location management

**Files Modified:**
- `packages/core/src/index.ts` - Added exports for location service and types
- `apps/web/src/hooks/index.ts` - Added export for useLocation hook
- `apps/web/src/app/(app)/settings/settings-view.tsx` - Added location toggle section
- `apps/web/src/app/onboarding/onboarding-flow.tsx` - Enhanced location step with auto-detect and manual entry
- `apps/web/src/app/(app)/profile/profile-view.tsx` - Updated to use locationService.formatLocationForDisplay()
- `apps/web/src/app/(app)/profile/preview/profile-preview.tsx` - Updated to use locationService.formatLocationForDisplay()
- `packages/core/src/types/user.ts` - Made latitude/longitude optional in GeoLocation interface

**Files Deleted:**
- None

**Why / Notes:**
- Location is core functionality for a dating app (distance-based matching)
- Users should see location names (city, country) not raw coordinates for privacy
- Browser permission handling ensures proper UX when location is denied
- Manual entry fallback when geolocation permission is denied
- 5-minute caching to reduce API calls to reverse geocoding service

**Risks & Mitigations:**
- **Risk:** OpenStreetMap Nominatim API rate limits
  - **Mitigation:** 5-minute caching, respectful User-Agent header
- **Risk:** Permission denied on mobile browsers
  - **Mitigation:** Manual entry fallback with city/country fields
- **Risk:** Reverse geocoding failure
  - **Mitigation:** Graceful fallback to "Unknown location" display

**Follow-ups / TODO:**
- Consider adding a premium geocoding API for production (Google Maps, Mapbox)
- Add location-based discovery filtering integration
- Consider background location updates for real-time distance calculations
