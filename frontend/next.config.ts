import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker deployment - creates standalone build
  output: "standalone",
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-web"],
};

export default nextConfig;
