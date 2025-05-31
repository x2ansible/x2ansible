import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/files/:path*',
        destination: 'http://localhost:8000/api/files/:path*',
      },
      // Add more as needed, e.g. context, validate, classify, etc.
      // DO NOT proxy /api/auth/*
    ]
  },
};

export default nextConfig;
