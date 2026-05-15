import type { NextConfig } from "next";

/**
 * Production optimizations.
 * - reactStrictMode: catch render-time bugs early.
 * - poweredByHeader off: removes the X-Powered-By: Next.js leak.
 * - compress: gzip responses (nginx already gzips, but Next.js
 *   ETag + brotli fallback still helps for direct hits).
 * - productionBrowserSourceMaps off: cuts deploy bundle size.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  // Trim radix from imports of large icon libs so unused glyphs don't
  // ship in the main bundle.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
