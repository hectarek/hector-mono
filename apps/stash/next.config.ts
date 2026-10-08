import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  // Next.js 16.4 experiments: see docs/monorepo-guide.md#experimental-nextjs-options.
  experimental: {
    turbopackRustReactCompiler: true,
    turbopackGc: true,
    // A page that reads the session stops prerendering at the read; the auth service's
    // catch (and Neon's own) then log that stop as a failed sign-in. Requests log as before.
    hideLogsAfterAbort: true,
  },
};

export default nextConfig;
