"use client";

import { motion } from "framer-motion";
import { Navigation } from "lucide-react";
import type { CampusLocation } from "@/db/campusDb";
import type { CalculatedRoute } from "@/utils/routing";

export function InstructionBottomSheet({ destination, route, error, onClose }: { destination: CampusLocation; route: CalculatedRoute | null; error: string | null; onClose: () => void }) {
  return (
    <motion.aside initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 24, stiffness: 260 }} className="absolute inset-x-0 bottom-0 z-30 rounded-t-[2rem] bg-white p-5 shadow-2xl">
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Navigating to {destination.category}</p><h2 className="text-xl font-black text-slate-950">{destination.name}</h2><p className="mt-1 text-sm text-slate-500">{destination.description}</p></div><button type="button" onClick={onClose} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">Close</button></div>
      <div className="mt-4 rounded-2xl bg-emerald-50 p-4"><div className="flex items-center gap-2 text-emerald-800"><Navigation size={18} /><span className="font-black">{route ? `${Math.round(route.distanceMeters)}m walk` : "Calculating offline route"}</span></div>{error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}{route && <ol className="mt-4 space-y-3">{route.steps.map((step, index) => <li key={`${step.from.latitude}-${step.to.latitude}-${index}`} className="flex gap-3 text-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">{index + 1}</span><span className="pt-1 font-medium text-slate-700">{step.instruction}</span></li>)}</ol>}</div>
    </motion.aside>
  );
}
