import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Next.js 16.4 experiment: see docs/monorepo-guide.md#experimental-nextjs-options.
  experimental: {
    turbopackGc: true,
  },
};

export default nextConfig;
