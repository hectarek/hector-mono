import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Next.js 16.4 experiments: see docs/monorepo-guide.md#experimental-nextjs-options.
    turbopackRustReactCompiler: true,
    turbopackGc: true,
    // A page that reads the session stops prerendering at the read; Neon Auth's own catch
    // then logs that stop as a cookie validation error. Requests log as before.
    hideLogsAfterAbort: true,
  },
};

export default nextConfig;
