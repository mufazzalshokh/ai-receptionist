// ============================================
// Structured Logger (pino)
// ============================================

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino/file", options: { destination: 1 } }
      : undefined,
});

export function createSessionLogger(callSid: string): pino.Logger {
  return logger.child({ callSid });
}
