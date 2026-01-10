import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker deployment - creates standalone build
  output: "standalone",
};

export default nextConfig;
