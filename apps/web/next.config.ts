import type { NextConfig } from "next";

const allowedOrigin = process.env.CORS_ALLOWED_ORIGINS ?? "*";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ai-receptionist/core",
    "@ai-receptionist/config",
    "@ai-receptionist/db",
    "@ai-receptionist/types",
  ],
  headers: async () => [
    {
      // CORS for chat widget API
      source: "/api/chat/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: allowedOrigin.split(",")[0] },
        { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization,X-API-Key" },
      ],
    },
    {
      // CORS for widget config endpoint
      source: "/api/widget/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: allowedOrigin.split(",")[0] },
        { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type,X-API-Key" },
      ],
    },
  ],
};

export default nextConfig;
