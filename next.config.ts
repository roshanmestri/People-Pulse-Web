import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // next/image only optimises remote images from hosts listed here.
    // Uploaded photos live in Vercel Blob in production (src/lib/storage.ts).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  experimental: {
    serverActions: {
      // Default is 1 MB, which rejects normal photos before our own checks run. Vercel caps
      // request bodies at 4.5 MB, so the browser shrinks photos first (src/lib/shrink-image.ts)
      // and the server accepts up to 4 MB (src/lib/image-rules.ts) + form-data overhead.
      bodySizeLimit: "4.5mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
