import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Type casting agar compiler Next.js 16 tidak memprotes properti eslint
  ...({
    eslint: {
      ignoreDuringBuilds: true,
    },
  } as any),
};

export default nextConfig;