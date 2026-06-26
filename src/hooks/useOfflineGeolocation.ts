"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface OfflineGeolocationState {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  source: "gps" | "cached" | "fallback";
  permissionState: PermissionState | "unsupported" | "unknown";
  error: string | null;
  loading: boolean;
}

const STORAGE_KEY = "lasu:last-known-position";
const fallbackPosition: OfflineGeolocationState = { latitude: 6.46518, longitude: 3.19942, accuracy: null, heading: null, source: "fallback", permissionState: "unknown", error: null, loading: false };

export function useOfflineGeolocation(maxAccuracyMeters = 80) {
  const [state, setState] = useState<OfflineGeolocationState>({ ...fallbackPosition, loading: true });
  const watchIdRef = useRef<number | null>(null);

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

  const applyPosition = useCallback((position: GeolocationPosition) => {
    const nextState: OfflineGeolocationState = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
      source: "gps",
      permissionState: "granted",
      error: position.coords.accuracy > maxAccuracyMeters ? `Location accuracy is about ${Math.round(position.coords.accuracy)}m. Route may be approximate.` : null,
      loading: false
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    setState(nextState);
  }, [maxAccuracyMeters]);

  const startWatching = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ ...loadCachedPosition(), permissionState: "unsupported", error: "Geolocation is unavailable on this device.", loading: false });
      return;
    }
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    setState((current) => ({ ...current, loading: true, error: null }));
    watchIdRef.current = navigator.geolocation.watchPosition(
      applyPosition,
      (error) => setState({ ...loadCachedPosition(), permissionState: error.code === error.PERMISSION_DENIED ? "denied" : "unknown", error: error.message || "Using your last known campus position.", loading: false }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 1000 * 10 }
    );
  }, [applyPosition, loadCachedPosition]);

  const refresh = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ ...loadCachedPosition(), permissionState: "unsupported", error: "Geolocation is unavailable on this device.", loading: false });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(applyPosition, (error) => {
      setState({ ...loadCachedPosition(), permissionState: error.code === error.PERMISSION_DENIED ? "denied" : "unknown", error: error.message || "Using your last known campus position.", loading: false });
    }, { enableHighAccuracy: true, timeout: 9000, maximumAge: 1000 * 60 * 2 });
    startWatching();
  }, [applyPosition, loadCachedPosition, startWatching]);

  useEffect(() => {
    setState({ ...loadCachedPosition(), loading: true });
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" }).then((status) => {
        setState((current) => ({ ...current, permissionState: status.state }));
        status.onchange = () => setState((current) => ({ ...current, permissionState: status.state }));
      }).catch(() => setState((current) => ({ ...current, permissionState: "unknown" })));
    }
    refresh();
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [loadCachedPosition, refresh]);

  return { ...state, refresh, startWatching };
}
