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
  // The MCP endpoint's sign-in and consent pages can't be framed by another site, where a click
  // could be lifted onto Allow (docs/build-plan.md KTD22).
  async headers() {
    return [
      {
        source: "/auth/oauth/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
