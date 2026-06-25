"use client";

import { useCallback, useEffect, useState } from "react";

export interface OfflineGeolocationState {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  source: "gps" | "cached" | "fallback";
  error: string | null;
  loading: boolean;
}

const STORAGE_KEY = "lasu:last-known-position";
const fallbackPosition: OfflineGeolocationState = { latitude: 6.46518, longitude: 3.19942, accuracy: null, source: "fallback", error: null, loading: false };

export function useOfflineGeolocation(maxAccuracyMeters = 80) {
  const [state, setState] = useState<OfflineGeolocationState>({ ...fallbackPosition, loading: true });

  const loadCachedPosition = useCallback(() => {
    if (typeof window === "undefined") return fallbackPosition;
    const cached = window.localStorage.getItem(STORAGE_KEY);
    if (!cached) return fallbackPosition;
    try {
      return { ...(JSON.parse(cached) as OfflineGeolocationState), source: "cached" as const, loading: false, error: null };
    } catch {
      return fallbackPosition;
    }
  }, []);

  const refresh = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ ...loadCachedPosition(), error: "Geolocation is unavailable on this device.", loading: false });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextState: OfflineGeolocationState = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: "gps",
          error: position.coords.accuracy > maxAccuracyMeters ? `Location accuracy is about ${Math.round(position.coords.accuracy)}m. Route may be approximate.` : null,
          loading: false
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        setState(nextState);
      },
      (error) => setState({ ...loadCachedPosition(), error: error.message || "Using your last known campus position.", loading: false }),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 1000 * 60 * 5 }
    );
  }, [loadCachedPosition, maxAccuracyMeters]);

  useEffect(() => {
    setState({ ...loadCachedPosition(), loading: true });
    refresh();
  }, [loadCachedPosition, refresh]);

  return { ...state, refresh };
}
