import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ldd/core", "@ldd/ui"],
};

export default nextConfig;
