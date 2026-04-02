// ============================================
// Voice Server Entry Point
// ============================================

import { createVoiceServer } from "./server";
import { logger } from "./utils/logger";

// Validate required environment variables at startup
const REQUIRED_ENV = [
  "ANTHROPIC_API_KEY",
  "DEEPGRAM_API_KEY",
  "ELEVENLABS_API_KEY",
  "VOICE_WS_SECRET",
] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    logger.error({ key }, "Missing required environment variable");
    process.exit(1);
  }
}

const PORT = parseInt(process.env.PORT ?? "8080", 10);

createVoiceServer(PORT);
