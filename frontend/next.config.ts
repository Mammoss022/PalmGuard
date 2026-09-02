import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server accept requests from a phone on the same LAN
  // (accessing via this machine's local IP instead of localhost) — Next.js
  // otherwise rejects cross-origin dev requests to prevent DNS rebinding.
  allowedDevOrigins: ["192.168.1.174"],
};

export default nextConfig;
