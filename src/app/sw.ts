import { defaultCache } from "@serwist/next/worker";
import { ExpirationPlugin, Serwist, StaleWhileRevalidate, CacheFirst, NetworkFirst } from "serwist";

const serwist = new Serwist({
  // @ts-expect-error Injected by @serwist/next at build time.
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({ cacheName: "lasu-app-shell" })
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/tiles/") || url.pathname.endsWith(".pbf") || url.pathname.endsWith(".mvt"),
      handler: new CacheFirst({
        cacheName: "lasu-vector-tiles",
        plugins: [new ExpirationPlugin({ maxEntries: 5000, maxAgeSeconds: 60 * 60 * 24 * 365 })]
      })
    },
    {
      matcher: ({ url }) => url.pathname.includes("version.json") || url.pathname.includes("lasu-style.json"),
      handler: new StaleWhileRevalidate({ cacheName: "lasu-map-metadata" })
    }
  ]
});

serwist.addEventListeners();
