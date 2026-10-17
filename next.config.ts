import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server (HMR / hot refresh) to accept cross-origin requests
  // when accessed through a cloudflared tunnel. Add any custom tunnel
  // hostname here alongside the trycloudflare quick-tunnel wildcard.
  allowedDevOrigins: ['recipe-vision.gabe-reichenberger.com'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 's3.*.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
