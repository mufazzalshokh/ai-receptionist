import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ai-receptionist/core",
    "@ai-receptionist/config",
    "@ai-receptionist/db",
    "@ai-receptionist/types",
  ],
  // Prevent webpack from bundling Prisma — it must be resolved by Node.js at
  // runtime so its dynamic engine-path detection works correctly.
  serverExternalPackages: ["@prisma/client"],
  // Expand output file tracing to the monorepo root so the Prisma query
  // engine binary (libquery_engine-rhel-openssl-3.0.x.so.node) inside the
  // pnpm virtual store is included in the Vercel serverless function bundle.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // CORS headers are set dynamically in the route handlers themselves
  // (apps/web/src/app/api/chat/route.ts and apps/web/src/app/api/widget/config/route.ts)
  // to avoid duplicate Access-Control-Allow-Origin headers.
};

export default nextConfig;
