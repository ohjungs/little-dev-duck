import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ldd/core", "@ldd/ui", "@ldd/api"],
};

export default nextConfig;
