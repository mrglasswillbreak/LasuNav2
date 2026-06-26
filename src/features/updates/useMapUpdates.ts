"use client";

import { useCallback, useEffect, useState } from "react";
import { downloadDemoTilePack, offlineTileUsageBytes } from "@/lib/offlineTiles";

interface RemoteVersion { version: string; sizeMb: number; notes: string; }

export function useMapUpdates() {
  const [remoteVersion, setRemoteVersion] = useState<RemoteVersion | null>(null);
  const [progress, setProgress] = useState("Idle");
  const [usageBytes, setUsageBytes] = useState(0);

  const refreshUsage = useCallback(() => offlineTileUsageBytes().then(setUsageBytes).catch(() => setUsageBytes(0)), []);

  useEffect(() => { refreshUsage(); fetch("/version.json", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then(setRemoteVersion).catch(() => setRemoteVersion(null)); }, [refreshUsage]);

  const download = useCallback(async () => {
    await downloadDemoTilePack(({ completed, total, status }) => setProgress(status === "ready" ? "Offline map ready" : `Downloading ${completed}/${total} tiles`));
    await refreshUsage();
  }, [refreshUsage]);

  return { remoteVersion, progress, usageBytes, download };
}
