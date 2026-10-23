import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Next.js 16.4 experiments: see docs/monorepo-guide.md#experimental-nextjs-options.
    turbopackRustReactCompiler: true,
    turbopackGc: true,
    // A page that reads the session stops prerendering at the read; NeonAuthService's catch
    // (and Neon's own) then log that stop as a failed sign-in. Requests log as before.
    hideLogsAfterAbort: true,
  },
};

export default nextConfig;
