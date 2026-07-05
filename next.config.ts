import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dokploy runs this as a Docker container, not a serverless function —
  // `standalone` produces a minimal self-contained server (.next/standalone)
  // that the Dockerfile copies wholesale, rather than tracing per-route bundles.
  output: "standalone",
};

export default nextConfig;
