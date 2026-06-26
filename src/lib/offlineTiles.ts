import { openDB, type DBSchema } from "idb";

type TileStatus = "idle" | "downloading" | "ready" | "error";

interface LasuTileDb extends DBSchema {
  tiles: { key: string; value: { key: string; blob: Blob; bytes: number; updatedAt: number } };
  meta: { key: string; value: { key: string; value: string | number; updatedAt: number } };
}

const DB_NAME = "lasu-offline-map-assets";
const TILE_URL_TEMPLATE = "/tiles/lasu/{z}/{x}/{y}.pbf";

export const offlineTileUrl = "lasu-offline://tiles/{z}/{x}/{y}.pbf";

async function tileDb() {
  return openDB<LasuTileDb>(DB_NAME, 1, { upgrade(db) { db.createObjectStore("tiles", { keyPath: "key" }); db.createObjectStore("meta", { keyPath: "key" }); } });
}

export async function getOfflineTile(key: string) { return (await tileDb()).get("tiles", key); }

export function tileKey(z: number, x: number, y: number) { return `${z}/${x}/${y}`; }

export async function resolveTileUrl(z: number, x: number, y: number) {
  const key = tileKey(z, x, y);
  const cached = await getOfflineTile(key);
  if (cached) return URL.createObjectURL(cached.blob);
  return TILE_URL_TEMPLATE.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}

export async function putOfflineTile(key: string, blob: Blob) {
  await (await tileDb()).put("tiles", { key, blob, bytes: blob.size, updatedAt: Date.now() });
}

export async function downloadDemoTilePack(onProgress?: (progress: { completed: number; total: number; status: TileStatus }) => void) {
  const tiles = [{ z: 15, x: 16678, y: 15825 }, { z: 16, x: 33357, y: 31651 }, { z: 16, x: 33358, y: 31651 }];
  let completed = 0;
  onProgress?.({ completed, total: tiles.length, status: "downloading" });
  for (const tile of tiles) {
    const url = TILE_URL_TEMPLATE.replace("{z}", String(tile.z)).replace("{x}", String(tile.x)).replace("{y}", String(tile.y));
    const response = await fetch(url);
    if (response.ok) await putOfflineTile(tileKey(tile.z, tile.x, tile.y), await response.blob());
    completed += 1;
    onProgress?.({ completed, total: tiles.length, status: "downloading" });
  }
  await (await tileDb()).put("meta", { key: "tilePackVersion", value: "1", updatedAt: Date.now() });
  onProgress?.({ completed, total: tiles.length, status: "ready" });
}

export async function offlineTileUsageBytes() { return (await (await tileDb()).getAll("tiles")).reduce((sum, tile) => sum + tile.bytes, 0); }
