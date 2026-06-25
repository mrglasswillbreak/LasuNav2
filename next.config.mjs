import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.destination === "document",
      handler: "NetworkFirst",
      options: {
        cacheName: "lasu-pages",
        expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 }
      }
    },
    {
      urlPattern: ({ request }) => ["script", "style", "worker"].includes(request.destination),
      handler: "StaleWhileRevalidate",
      options: { cacheName: "lasu-static-assets" }
    },
    {
      urlPattern: ({ request }) => ["font", "image"].includes(request.destination),
      handler: "CacheFirst",
      options: {
        cacheName: "lasu-fonts-images",
        expiration: { maxEntries: 96, maxAgeSeconds: 60 * 60 * 24 * 180 }
      }
    },
    {
      urlPattern: ({ url }) => url.pathname.endsWith(".json") && (url.pathname.includes("map") || url.pathname.includes("tiles") || url.pathname.includes("style")),
      handler: "CacheFirst",
      options: {
        cacheName: "lasu-map-vector-layers",
        expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 365 }
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true
};

export default pwaConfig(nextConfig);
