import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/tandpfun/skill-icons/**",
      },
    ],
  },
  // Next.js 16.4 experiments: see docs/monorepo-guide.md#experimental-nextjs-options.
  experimental: {
    turbopackRustReactCompiler: true,
    turbopackGc: true,
  },
};

export default nextConfig;
