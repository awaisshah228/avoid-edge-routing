import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["reactflow-edge-routing", "obstacle-router"],
};

export default nextConfig;
