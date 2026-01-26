/**
 * Location Service
 * Handles geolocation permissions, coordinate fetching, and reverse geocoding
 * Coordinates are stored but never shown to users - only location names are displayed
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LocationDetails {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  formattedAddress?: string;
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface LocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'GEOCODING_FAILED' | 'NOT_SUPPORTED';
  message: string;
}

class LocationService {
  private cachedLocation: LocationDetails | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if geolocation is supported in the browser
   */
  isGeolocationSupported(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Check current permission status
   */
  async getPermissionStatus(): Promise<LocationPermissionStatus> {
    if (!this.isGeolocationSupported()) {
      return 'unavailable';
    }

    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state as LocationPermissionStatus;
      }
      // Fallback for browsers that don't support permissions API
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }

  /**
   * Request location permission and get current coordinates
   */
  async requestLocation(options?: PositionOptions): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!this.isGeolocationSupported()) {
        reject({
          code: 'NOT_SUPPORTED',
          message: 'Geolocation is not supported by your browser',
        } as LocationError);
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Accept cached position up to 1 minute old
        ...options,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let locationError: LocationError;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              locationError = {
                code: 'PERMISSION_DENIED',
                message: 'Location permission was denied. Please enable location access in your browser settings.',
              };
              break;
            case error.POSITION_UNAVAILABLE:
              locationError = {
                code: 'POSITION_UNAVAILABLE',
                message: 'Unable to determine your location. Please try again.',
              };
              break;
            case error.TIMEOUT:
              locationError = {
                code: 'TIMEOUT',
                message: 'Location request timed out. Please try again.',
              };
              break;
            default:
              locationError = {
                code: 'POSITION_UNAVAILABLE',
                message: 'An unknown error occurred while getting your location.',
              };
          }
          reject(locationError);
        },
        defaultOptions
      );
    });
  }

  /**
   * Reverse geocode coordinates to get location name
   * Uses OpenStreetMap Nominatim API (free, no API key required)
   */
  async reverseGeocode(coords: LocationCoordinates): Promise<LocationDetails> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'CRUSH-Dating-App/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();

      const locationDetails: LocationDetails = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        city: data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.municipality ||
              data.address?.county,
        state: data.address?.state || data.address?.region,
        country: data.address?.country,
        countryCode: data.address?.country_code?.toUpperCase(),
        formattedAddress: data.display_name,
      };

      // Cache the result
      this.cachedLocation = locationDetails;
      this.cacheTimestamp = Date.now();

      return locationDetails;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);

      // Return coordinates with unknown location
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        city: undefined,
        country: undefined,
      };
    }
  }

  /**
   * Get current location with location name (full flow)
   * This is the main method to use - gets coordinates and converts to location name
   */
  async getCurrentLocation(forceRefresh = false): Promise<LocationDetails> {
    // Return cached location if still valid
    if (
      !forceRefresh &&
      this.cachedLocation &&
      Date.now() - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return this.cachedLocation;
    }

    // Get coordinates
    const coords = await this.requestLocation();

    // Reverse geocode to get location name
    const locationDetails = await this.reverseGeocode(coords);

    return locationDetails;
  }

  /**
   * Format location for display (only shows city and country, never coordinates)
   * Accepts GeoLocation, LocationDetails, or any object with optional city/country fields
   */
  formatLocationForDisplay(location: { city?: string; country?: string } | null | undefined): string {
    if (!location) return '';

    const parts: string[] = [];

    if (location.city) {
      parts.push(location.city);
    }

    if (location.country) {
      parts.push(location.country);
    }

    return parts.join(', ') || 'Unknown location';
  }

  /**
   * Format location with more detail
   * Accepts GeoLocation, LocationDetails, or any object with optional city/state/country fields
   */
  formatLocationDetailed(location: { city?: string; state?: string; country?: string } | null | undefined): string {
    if (!location) return '';

    const parts: string[] = [];

    if (location.city) {
      parts.push(location.city);
    }

    if (location.state && location.state !== location.city) {
      parts.push(location.state);
    }

    if (location.country) {
      parts.push(location.country);
    }

    return parts.join(', ') || 'Unknown location';
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  calculateDistance(
    coords1: { latitude: number; longitude: number },
    coords2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(coords2.latitude - coords1.latitude);
    const dLon = this.toRad(coords2.longitude - coords1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(coords1.latitude)) *
        Math.cos(this.toRad(coords2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
  }

  /**
   * Format distance for display
   */
  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return 'Less than 1 km away';
    } else if (distanceKm === 1) {
      return '1 km away';
    } else {
      return `${distanceKm} km away`;
    }
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Clear cached location
   */
  clearCache(): void {
    this.cachedLocation = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Watch location changes (for real-time updates)
   */
  watchLocation(
    onUpdate: (location: LocationDetails) => void,
    onError: (error: LocationError) => void,
    options?: PositionOptions
  ): number | null {
    if (!this.isGeolocationSupported()) {
      onError({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by your browser',
      });
      return null;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 30000,
      maximumAge: 120000, // Accept cached position up to 2 minutes old
      ...options,
    };

    return navigator.geolocation.watchPosition(
      async (position) => {
        const coords: LocationCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        try {
          const locationDetails = await this.reverseGeocode(coords);
          onUpdate(locationDetails);
        } catch {
          // If reverse geocoding fails, still provide coordinates
          onUpdate({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        }
      },
      (error) => {
        let locationError: LocationError;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            locationError = {
              code: 'PERMISSION_DENIED',
              message: 'Location permission was denied.',
            };
            break;
          case error.POSITION_UNAVAILABLE:
            locationError = {
              code: 'POSITION_UNAVAILABLE',
              message: 'Unable to determine your location.',
            };
            break;
          case error.TIMEOUT:
            locationError = {
              code: 'TIMEOUT',
              message: 'Location request timed out.',
            };
            break;
          default:
            locationError = {
              code: 'POSITION_UNAVAILABLE',
              message: 'An unknown error occurred.',
            };
        }
        onError(locationError);
      },
      defaultOptions
    );
  }

  /**
   * Stop watching location
   */
  stopWatching(watchId: number): void {
    if (this.isGeolocationSupported() && watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  }
}

export const locationService = new LocationService();
