import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ldd/core", "@ldd/ui", "@ldd/api", "@ldd/mascot"],
};

export default nextConfig;
