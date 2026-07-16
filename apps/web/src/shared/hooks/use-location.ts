'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  locationService,
  onboardingService,
  authVerificationFactsFromUser,
  useAuthStore,
  LocationDetails,
  LocationPermissionStatus,
  LocationError,
} from '@crush/core';

interface UseLocationOptions {
  autoRequest?: boolean;
  watchPosition?: boolean;
  updateProfile?: boolean;
}

interface UseLocationReturn {
  // Location data
  location: LocationDetails | null;
  locationName: string;

  // Permission state
  permissionStatus: LocationPermissionStatus;
  isPermissionGranted: boolean;
  isPermissionDenied: boolean;

  // Loading/error states
  isLoading: boolean;
  error: LocationError | null;

  // Actions
  requestLocation: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  clearLocation: () => void;

  // Location toggle (for settings)
  isLocationEnabled: boolean;
  enableLocation: () => Promise<void>;
  disableLocation: () => Promise<void>;
  toggleLocation: () => Promise<void>;
}

const locationEnabledKey = (uid: string) => `crush:location-enabled:${uid}`;

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const { autoRequest = false, watchPosition = false, updateProfile = false } = options;

  const { user, profile, refreshProfile } = useAuthStore();

  const [location, setLocation] = useState<LocationDetails | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('prompt');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<LocationError | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Load saved preference on mount
  useEffect(() => {
    mountedRef.current = true;

    // Check saved preference
    const savedEnabled = user ? localStorage.getItem(locationEnabledKey(user.uid)) : null;
    if (savedEnabled === 'true') {
      setIsLocationEnabled(true);
    }

    // Check permission status
    locationService.getPermissionStatus().then((status) => {
      if (mountedRef.current) {
        setPermissionStatus(status);
      }
    });

    // Load existing location from profile
    if (profile?.location) {
      setLocation({
        latitude: profile.location.latitude || 0,
        longitude: profile.location.longitude || 0,
        city: profile.location.city,
        country: profile.location.country,
      });
    }

    return () => {
      mountedRef.current = false;
      if (watchIdRef.current !== null) {
        locationService.stopWatching(watchIdRef.current);
      }
    };
  }, [profile?.location, user]);

  // Watch position if enabled
  useEffect(() => {
    if (watchPosition && isLocationEnabled && permissionStatus === 'granted') {
      watchIdRef.current = locationService.watchLocation(
        (newLocation) => {
          if (mountedRef.current) {
            setLocation(newLocation);
          }
        },
        (err) => {
          if (mountedRef.current) {
            setError(err);
          }
        }
      );

      return () => {
        if (watchIdRef.current !== null) {
          locationService.stopWatching(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    }
  }, [watchPosition, isLocationEnabled, permissionStatus]);

  const requestLocation = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const coordinates = await locationService.requestLocation({ maximumAge: 0 });
      const locationDetails = await locationService.reverseGeocode(coordinates);

      if (mountedRef.current) {
        setLocation(locationDetails);
        setPermissionStatus('granted');
        setIsLocationEnabled(true);
        if (user) localStorage.setItem(locationEnabledKey(user.uid), 'true');
      }

      // Update user profile if requested
      if (updateProfile && user && locationDetails) {
        await onboardingService.confirmCurrentLocation(
          {
            latitude: locationDetails.latitude,
            longitude: locationDetails.longitude,
            accuracyMeters: coordinates.accuracy,
            capturedAt: new Date().toISOString(),
            city: locationDetails.city,
            region: locationDetails.state,
            country: locationDetails.country,
          },
          authVerificationFactsFromUser(useAuthStore.getState().user)
        );
        await refreshProfile();
      }
    } catch (err) {
      const locationError = err as LocationError;
      if (mountedRef.current) {
        setError(locationError);
        if (locationError.code === 'PERMISSION_DENIED') {
          setPermissionStatus('denied');
        }
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading, updateProfile, user, refreshProfile]);

  // Auto request location if enabled (declared after requestLocation so it can
  // depend on it without a temporal-dead-zone reference).
  useEffect(() => {
    if (autoRequest && isLocationEnabled && !location && permissionStatus !== 'denied') {
      requestLocation();
    }
  }, [autoRequest, isLocationEnabled, location, permissionStatus, requestLocation]);

  const refreshLocation = useCallback(async () => {
    locationService.clearCache();
    await requestLocation();
  }, [requestLocation]);

  const clearLocation = useCallback(() => {
    setLocation(null);
    locationService.clearCache();
  }, []);

  const enableLocation = useCallback(async () => {
    setIsLocationEnabled(true);
    if (user) localStorage.setItem(locationEnabledKey(user.uid), 'true');
    await requestLocation();
  }, [requestLocation, user]);

  const disableLocation = useCallback(async () => {
    setIsLocationEnabled(false);
    if (user) localStorage.setItem(locationEnabledKey(user.uid), 'false');

    clearLocation();
  }, [user, clearLocation]);

  const toggleLocation = useCallback(async () => {
    if (isLocationEnabled) {
      await disableLocation();
    } else {
      await enableLocation();
    }
  }, [isLocationEnabled, enableLocation, disableLocation]);

  const locationName = location
    ? locationService.formatLocationForDisplay(location)
    : profile?.location
      ? locationService.formatLocationForDisplay(profile.location)
      : '';

  return {
    location,
    locationName,
    permissionStatus,
    isPermissionGranted: permissionStatus === 'granted',
    isPermissionDenied: permissionStatus === 'denied',
    isLoading,
    error,
    requestLocation,
    refreshLocation,
    clearLocation,
    isLocationEnabled,
    enableLocation,
    disableLocation,
    toggleLocation,
  };
}

/**
 * Hook to calculate and display distance between current user and another profile
 */
export function useDistance(otherLocation?: { latitude?: number; longitude?: number }) {
  const { location } = useLocation();
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (
      location?.latitude &&
      location?.longitude &&
      otherLocation?.latitude &&
      otherLocation?.longitude
    ) {
      const dist = locationService.calculateDistance(
        { latitude: location.latitude, longitude: location.longitude },
        { latitude: otherLocation.latitude, longitude: otherLocation.longitude }
      );
      setDistance(dist);
    } else {
      setDistance(null);
    }
  }, [location, otherLocation]);

  const formattedDistance = distance !== null ? locationService.formatDistance(distance) : null;

  return {
    distance,
    formattedDistance,
  };
}
