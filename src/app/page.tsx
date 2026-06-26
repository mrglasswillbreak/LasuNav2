"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Database, LocateFixed, MapPin, Satellite, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { type CampusLocation, campusDb, searchLocations, seedCampusDb } from "@/db/campusDb";
import { LasuMap } from "@/features/map/LasuMap";
import { InstructionBottomSheet } from "@/features/navigation/InstructionBottomSheet";
import { useMapUpdates } from "@/features/updates/useMapUpdates";
import { useOfflineGeolocation } from "@/hooks/useOfflineGeolocation";
import { calculateRoute, type CalculatedRoute } from "@/utils/routing";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(null);
  const [route, setRoute] = useState<CalculatedRoute | null>(null);
  const [online, setOnline] = useState(true);
  const [followMode, setFollowMode] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);
  const position = useOfflineGeolocation();
  const updates = useMapUpdates();

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  useEffect(() => { seedCampusDb().then(() => searchLocations("")).then(setLocations).catch(() => setLocations([])); }, []);
  useEffect(() => { let active = true; searchLocations(query).then((results) => { if (active) setLocations(results); }); return () => { active = false; }; }, [query]);

  useEffect(() => {
    if (!selectedLocation) { setRoute(null); setRouteError(null); return; }
    campusDb.routing_graph.orderBy("version").last().then((graph) => {
      if (!graph) throw new Error("Campus routing graph is unavailable offline.");
      setRoute(calculateRoute({ latitude: position.latitude, longitude: position.longitude }, selectedLocation, graph));
      setRouteError(null);
    }).catch((error) => { setRoute(null); setRouteError(error instanceof Error ? error.message : "Unable to calculate route."); });
  }, [position.latitude, position.longitude, selectedLocation]);

  const handleSelectLocation = useCallback((location: CampusLocation) => setSelectedLocation(location), []);

  return (
    <main className="relative mx-auto min-h-screen max-w-6xl overflow-hidden bg-slate-100 shadow-2xl">
      <LasuMap locations={locations} selectedLocation={selectedLocation} route={route} position={position} followMode={followMode} onSelectLocation={handleSelectLocation} />
      <section className="pointer-events-none relative z-20 flex min-h-screen flex-col">
        <div className="pointer-events-auto grid gap-3 p-4 md:max-w-md">
          <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow ${online ? "bg-white/90 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{online ? <Wifi size={14} /> : <WifiOff size={14} />}{online ? "Online — app shell cached by Serwist" : "Offline — using IndexedDB map data"}</div>
          {position.permissionState !== "granted" && <button type="button" onClick={position.refresh} className="flex items-center gap-2 rounded-2xl bg-blue-600/95 px-4 py-3 text-left text-xs font-semibold text-white shadow-xl"><ShieldCheck size={18} /><span>Enable GPS for live campus navigation<br /><span className="text-blue-100">Your browser will ask for location access. Current state: {position.permissionState}</span></span></button>}
          {updates.remoteVersion && <button type="button" onClick={updates.download} className="flex items-center gap-2 rounded-2xl bg-emerald-950/90 px-4 py-3 text-left text-xs font-semibold text-white shadow-xl"><Database size={18} /><span>Download LASU demo map pack v{updates.remoteVersion.version} · {updates.remoteVersion.sizeMb}MB<br /><span className="text-emerald-200">{updates.progress} · {(updates.usageBytes / 1024 / 1024).toFixed(2)}MB stored</span></span></button>}
          <div className="rounded-3xl bg-white/95 p-3 shadow-xl backdrop-blur"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search FMS, MBA, Senate..." className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium outline-none placeholder:text-slate-400" /><div className="mt-3 max-h-56 overflow-y-auto">{locations.map((location) => <button key={location.id} type="button" onClick={() => setSelectedLocation(location)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-emerald-50"><span className="rounded-2xl bg-emerald-100 p-2 text-emerald-700"><MapPin size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{location.name}</span><span className="block text-xs text-slate-500">{location.acronym} · {location.category}</span></span></button>)}</div></div>
        </div>
        <div className="mt-auto flex justify-end gap-2 p-4"><button type="button" onClick={() => setFollowMode((v) => !v)} className={`pointer-events-auto flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold shadow-xl ${followMode ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}><Satellite size={18} />Follow</button><button type="button" onClick={position.refresh} className="pointer-events-auto flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-xl"><LocateFixed size={18} />Refresh</button></div>
      </section>
      <AnimatePresence>{selectedLocation && <InstructionBottomSheet destination={selectedLocation} route={route} error={routeError ?? position.error} onClose={() => setSelectedLocation(null)} />}</AnimatePresence>
    </main>
  );
}
