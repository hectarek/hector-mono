import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Next.js 16.4 experiments: see docs/monorepo-guide.md#experimental-nextjs-options.
    turbopackRustReactCompiler: true,
    turbopackGc: true,
  },
};

export default nextConfig;
