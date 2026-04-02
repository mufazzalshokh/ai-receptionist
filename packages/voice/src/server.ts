// ============================================
// HTTP Server + WebSocket Server
// Health checks, metrics, and WS upgrade handling.
// ============================================

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { timingSafeEqual } from "crypto";
import { WebSocketServer } from "ws";
import { VoiceSessionManager } from "./session/voice-session-manager";
import { handleMediaStreamConnection } from "./ws-handler";
import { logger } from "./utils/logger";

const MAX_CONNECTIONS = parseInt(process.env.MAX_WS_CONNECTIONS ?? "50", 10);

export function createVoiceServer(port: number) {
  const sessionManager = new VoiceSessionManager();

  // HTTP server for health checks and Fly.io probes
  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          activeSessions: sessionManager.activeCount,
        })
      );
      return;
    }

    // Metrics endpoint — require METRICS_SECRET header
    if (req.url === "/metrics") {
      const secret = process.env.METRICS_SECRET;
      const provided = req.headers["x-metrics-secret"];
      if (secret && provided !== secret) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          activeSessions: sessionManager.activeCount,
          uptime: process.uptime(),
        })
      );
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  });

  // WebSocket server for Twilio Media Streams
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws/media-stream",
    maxPayload: 64 * 1024, // 64 KB — Twilio frames are <1 KB
    verifyClient: ({ req }, done) => {
      // Connection limit
      if (wss.clients.size >= MAX_CONNECTIONS) {
        logger.warn("Rejecting connection: at capacity");
        done(false, 503, "Server at capacity");
        return;
      }

      // Shared secret authentication
      const wsSecret = process.env.VOICE_WS_SECRET;
      if (wsSecret) {
        const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
        const token = url.searchParams.get("token") ?? "";
        try {
          const a = Buffer.from(token);
          const b = Buffer.from(wsSecret);
          const valid = a.length === b.length && timingSafeEqual(a, b);
          done(valid, valid ? 200 : 403, valid ? "OK" : "Forbidden");
        } catch {
          done(false, 403, "Forbidden");
        }
        return;
      }

      done(true);
    },
  });

  wss.on("connection", (ws, req) => {
    handleMediaStreamConnection(ws, req, sessionManager);
  });

  // Start
  sessionManager.startCleanup();

  httpServer.listen(port, () => {
    logger.info({ port }, "Voice server listening");
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down voice server...");
    sessionManager.stopCleanup();
    await sessionManager.destroyAll();
    wss.close();
    httpServer.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return { httpServer, wss, sessionManager };
}
