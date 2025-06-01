import type { NextConfig } from "next";
import fs from "fs";
import yaml from "js-yaml";

// Load config.yaml if it exists
let cfg: any = { agent_endpoints: {}, file_endpoints: {} };

try {
  if (fs.existsSync("./config.yaml")) {
    const raw = fs.readFileSync("./config.yaml", "utf8");
    cfg = yaml.load(raw) || cfg;
  } else {
    console.warn("[next.config.ts] config.yaml not found, using defaults.");
  }
} catch (e) {
  console.error("[next.config.ts] Failed to load config.yaml:", e);
}

const nextConfig: NextConfig = {
  // NO static export - use Next.js server mode
  // output: 'export',  // <-- REMOVE THIS
  
  // Keep images optimized (since we have a server)
  images: {
    unoptimized: false
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
  },
  
  // API rewrites to your backend
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/files/:path*',
        destination: `${backendUrl}/api/files/:path*`,
      },
      {
        source: '/api/classify/:path*',
        destination: `${backendUrl}/api/classify/:path*`,
      },
      {
        source: '/api/validate/:path*',
        destination: `${backendUrl}/api/validate/:path*`,
      },
      {
        source: '/api/context/:path*',
        destination: `${backendUrl}/api/context/:path*`,
      },
      {
        source: '/api/generate/:path*',
        destination: `${backendUrl}/api/generate/:path*`,
      },
      // Keep /api/auth/* for NextAuth - don't proxy these
    ];
  },
  
  // Build configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Runtime configuration
  publicRuntimeConfig: {
    agentEndpoints: cfg.agent_endpoints,
    fileEndpoints: cfg.file_endpoints,
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
  },
};

export default nextConfig;