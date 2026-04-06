import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ai-receptionist/core",
    "@ai-receptionist/config",
    "@ai-receptionist/db",
    "@ai-receptionist/types",
  ],
  // CORS headers are set dynamically in the route handlers themselves
  // (apps/web/src/app/api/chat/route.ts and apps/web/src/app/api/widget/config/route.ts)
  // to avoid duplicate Access-Control-Allow-Origin headers.
};

export default nextConfig;
