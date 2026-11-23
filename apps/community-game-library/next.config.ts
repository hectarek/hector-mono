import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The service worker (docs/build-plan.md KTD19) is never cached, so the browser always sees a
  // new deploy's (Next.js's progressive-web-apps guide).
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
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
