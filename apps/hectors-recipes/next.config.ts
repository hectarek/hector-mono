import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Add by photo (ux-plan P10.2): the phone sends a shrunk JPEG, or a long screenshot's
      // pieces, at most 4 MB in all (MAX_PHOTO_BYTES); the rest is room for the form's own
      // bytes. Vercel refuses a request body over 4.5 MB whatever this says.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
