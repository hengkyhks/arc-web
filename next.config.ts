import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Bypass type errors from AppKit + Viem type mismatch
    ignoreBuildErrors: true,
  },
  // Allow cross-origin requests from network IP (needed for RainbowKit CSS)
  allowedDevOrigins: ['217.216.43.82', '217.216.43.82:3000'],
};

export default nextConfig;