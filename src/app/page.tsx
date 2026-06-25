"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LocateFixed, MapPin, Navigation, Search, Wifi, WifiOff } from "lucide-react";
import { campusDb, type CampusLocation, searchLocations, seedCampusDb } from "@/db/campusDb";
import { useOfflineGeolocation } from "@/hooks/useOfflineGeolocation";
import { calculateRoute, type CalculatedRoute } from "@/utils/routing";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<CampusLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<CampusLocation | null>(null);
  const [route, setRoute] = useState<CalculatedRoute | null>(null);
  const [online, setOnline] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);
  const position = useOfflineGeolocation();

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    seedCampusDb().then(() => searchLocations("")).then(setLocations).catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    let active = true;
    searchLocations(query).then((results) => {
      if (active) setLocations(results);
    });
    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => {
    if (!selectedLocation) {
      setRoute(null);
      setRouteError(null);
      return;
    }
    campusDb.routing_graph.orderBy("version").last().then((graph) => {
      if (!graph) throw new Error("Campus routing graph is unavailable.");
      setRoute(calculateRoute({ latitude: position.latitude, longitude: position.longitude }, selectedLocation, graph));
      setRouteError(null);
    }).catch((error) => {
      setRoute(null);
      setRouteError(error instanceof Error ? error.message : "Unable to calculate route.");
    });
  }, [position.latitude, position.longitude, selectedLocation]);

  const mapPoints = useMemo(() => locations.slice(0, 8), [locations]);

  return (
    <main className="relative mx-auto min-h-screen max-w-md overflow-hidden bg-slate-100 shadow-2xl">
      <section className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#dcfce7,_#f8fafc_42%,_#d1fae5)]">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(#94a3b8_1px,transparent_1px),linear-gradient(90deg,#94a3b8_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute left-[18%] top-[24%] h-48 w-3 rotate-[-22deg] rounded-full bg-emerald-700/50" />
        <div className="absolute left-[48%] top-[22%] h-64 w-3 rotate-[38deg] rounded-full bg-emerald-700/50" />
        <div className="absolute left-[20%] top-[52%] h-52 w-3 rotate-[72deg] rounded-full bg-emerald-700/50" />

        {mapPoints.map((location, index) => (
          <button key={location.id} type="button" onClick={() => setSelectedLocation(location)} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${22 + (index % 3) * 26}%`, top: `${28 + Math.floor(index / 3) * 20}%` }}>
            <span className="rounded-full bg-white p-2 text-emerald-700 shadow-lg ring-2 ring-emerald-600"><MapPin size={18} /></span>
            <span className="mt-1 max-w-[82px] rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow">{location.acronym}</span>
          </button>
        ))}

        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <span className="relative flex h-5 w-5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" /><span className="relative inline-flex h-5 w-5 rounded-full bg-blue-600 ring-4 ring-white" /></span>
          <span className="mt-2 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-bold text-white shadow">You</span>
        </div>
      </section>

      <section className="pointer-events-none relative z-10 flex min-h-screen flex-col">
        <div className="pointer-events-auto px-4 pt-4">
          <div className={`mb-3 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow ${online ? "bg-white/90 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {online ? "Online — offline cache ready after first load" : "Offline mode — using saved campus data"}
          </div>

          <div className="rounded-3xl bg-white/95 p-3 shadow-xl backdrop-blur">
            <label className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-3">
              <Search className="text-slate-500" size={20} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search FMS, MBA, Senate..." className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400" />
            </label>

            <div className="mt-3 max-h-56 overflow-y-auto">
              {locations.map((location) => (
                <button key={location.id} type="button" onClick={() => setSelectedLocation(location)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-emerald-50">
                  <span className="rounded-2xl bg-emerald-100 p-2 text-emerald-700"><MapPin size={18} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{location.name}</span><span className="block text-xs text-slate-500">{location.acronym} · {location.category}</span></span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto p-4">
          <button type="button" onClick={position.refresh} className="pointer-events-auto ml-auto flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-xl"><LocateFixed size={18} />Refresh location</button>
        </div>
      </section>

      <AnimatePresence>
        {selectedLocation && (
          <motion.aside initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 24, stiffness: 260 }} className="absolute inset-x-0 bottom-0 z-20 rounded-t-[2rem] bg-white p-5 shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{selectedLocation.category}</p><h2 className="text-xl font-black text-slate-950">{selectedLocation.name}</h2><p className="mt-1 text-sm text-slate-500">{selectedLocation.description}</p></div>
              <button type="button" onClick={() => setSelectedLocation(null)} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">Close</button>
            </div>

            <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-800"><Navigation size={18} /><span className="font-black">{route ? `${Math.round(route.distanceMeters)}m walk` : "Calculating route"}</span></div>
              {position.error && <p className="mt-2 text-xs text-amber-700">{position.error}</p>}
              {routeError && <p className="mt-2 text-sm font-semibold text-red-700">{routeError}</p>}
              {route && <ol className="mt-4 space-y-3">{route.steps.map((step, index) => <li key={`${step.from.latitude}-${step.to.latitude}-${index}`} className="flex gap-3 text-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">{index + 1}</span><span className="pt-1 font-medium text-slate-700">{step.instruction}</span></li>)}</ol>}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}
