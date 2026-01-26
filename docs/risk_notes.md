# Risk Notes

## Location Services Risks

### 1. API Rate Limiting (Low Risk)
- **Risk:** OpenStreetMap Nominatim API has usage limits
- **Impact:** Reverse geocoding may fail if rate limited
- **Mitigation:**
  - 5-minute caching implemented
  - Proper User-Agent header set
  - Fallback to "Unknown location" display
- **Status:** Mitigated

### 2. Browser Permission Denial (Medium Risk)
- **Risk:** Users may deny location permission
- **Impact:** Location-based features won't work optimally
- **Mitigation:**
  - Manual city/country entry fallback in onboarding
  - Clear messaging about why location is needed
  - Settings toggle to enable/disable anytime
- **Status:** Mitigated

### 3. Privacy Concerns (Low Risk)
- **Risk:** Users concerned about location data
- **Impact:** Users may abandon app
- **Mitigation:**
  - Never display raw coordinates to users
  - Only show city/country names
  - Clear privacy note in UI: "Your exact location coordinates are never shown to other users"
- **Status:** Mitigated

### 4. Geocoding Accuracy (Low Risk)
- **Risk:** Reverse geocoding may return incorrect city names
- **Impact:** User profile shows wrong location
- **Mitigation:**
  - Manual entry option available
  - Users can edit location in profile edit
- **Status:** Mitigated

## General Application Risks

### Authentication Flow
- Status: Monitored
- Notes: Auth state properly managed through Zustand store

### Data Consistency
- Status: Monitored
- Notes: Firestore used with proper error handling
