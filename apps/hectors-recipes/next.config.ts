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
    serverActions: {
      // Add by photo (ux-plan P10.2): the phone sends a shrunk JPEG, or a long screenshot's
      // pieces, at most 4 MB in all (MAX_PHOTO_BYTES); the rest is room for the form's own
      // bytes. Vercel refuses a request body over 4.5 MB whatever this says.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
