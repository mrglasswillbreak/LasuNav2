"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map } from "maplibre-gl";
import type { CampusLocation } from "@/db/campusDb";
import type { CalculatedRoute, Coordinate } from "@/utils/routing";
import { resolveTileUrl } from "@/lib/offlineTiles";

interface LasuMapProps { locations: CampusLocation[]; selectedLocation: CampusLocation | null; route: CalculatedRoute | null; position: Coordinate & { heading?: number | null }; followMode: boolean; onSelectLocation: (location: CampusLocation) => void; }

const LASU_CENTER: [number, number] = [3.2008, 6.4649];

export function LasuMap({ locations, selectedLocation, route, position, followMode, onSelectLocation }: LasuMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const previousPositionRef = useRef<Coordinate | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    maplibregl.addProtocol("lasu-offline", async (params) => {
      const match = params.url.match(/tiles\/(\d+)\/(\d+)\/(\d+)\.pbf/);
      if (!match) return { data: new ArrayBuffer(0) };
      const [, z, x, y] = match.map(Number);
      const url = await resolveTileUrl(z, x, y);
      const response = await fetch(url);
      return { data: await response.arrayBuffer() };
    });

    const map = new maplibregl.Map({ container: containerRef.current, style: "/map/lasu-style.json", center: LASU_CENTER, zoom: 16, attributionControl: false });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.on("load", () => {
      map.addSource("route", { type: "geojson", data: emptyRoute() });
      map.addLayer({ id: "route-glow", type: "line", source: "route", paint: { "line-color": "#fbbf24", "line-width": 10, "line-opacity": 0.35 } });
      map.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": "#047857", "line-width": 6, "line-opacity": 0.95 } });
    });
    mapRef.current = map;
    return () => { markerRef.current?.remove(); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = locations.map((location) => {
      const marker = new maplibregl.Marker({ color: selectedLocation?.id === location.id ? "#f59e0b" : "#059669" })
        .setLngLat([location.longitude, location.latitude])
        .setPopup(new maplibregl.Popup({ offset: 20 }).setText(location.name))
        .addTo(map);
      marker.getElement().addEventListener("click", () => onSelectLocation(location));
      return marker;
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [locations, onSelectLocation, selectedLocation?.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const element = markerRef.current?.getElement() ?? createUserMarker();
    if (!markerRef.current) markerRef.current = new maplibregl.Marker({ element, rotationAlignment: "map" }).setLngLat([position.longitude, position.latitude]).addTo(map);
    const previous = previousPositionRef.current ?? position;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / 900, 1);
      const latitude = previous.latitude + (position.latitude - previous.latitude) * t;
      const longitude = previous.longitude + (position.longitude - previous.longitude) * t;
      markerRef.current?.setLngLat([longitude, latitude]);
      element.style.setProperty("--heading", `${position.heading ?? 0}deg`);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    previousPositionRef.current = position;
    if (followMode) map.easeTo({ center: [position.longitude, position.latitude], duration: 900, essential: true });
  }, [followMode, position]);

  useEffect(() => {
    const source = mapRef.current?.getSource("route") as GeoJSONSource | undefined;
    source?.setData(route ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.path.map((p) => [p.longitude, p.latitude]) } } : emptyRoute());
  }, [route]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function emptyRoute(): GeoJSON.Feature<GeoJSON.LineString> { return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } }; }

function createUserMarker() {
  const element = document.createElement("div");
  element.className = "user-location-marker";
  element.innerHTML = `<span class="pulse"></span><svg viewBox="0 0 32 32" aria-label="Your location"><path d="M16 2 25 29 16 24 7 29 16 2Z" fill="#2563eb" stroke="white" stroke-width="3"/></svg>`;
  return element;
}
