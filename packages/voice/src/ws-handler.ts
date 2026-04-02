// ============================================
// WebSocket Handler
// Handles Twilio Media Stream WebSocket upgrades
// and routes messages to VoiceSession instances.
// ============================================

import type { IncomingMessage } from "http";
import type WebSocket from "ws";
import { getBusinessConfig, getKnowledgeBase } from "@ai-receptionist/config";
import { VoiceSession } from "./session/voice-session";
import { VoiceSessionManager } from "./session/voice-session-manager";
import { getDefaultVoiceConfig } from "./config/voice-config";
import { logger } from "./utils/logger";

export function handleMediaStreamConnection(
  ws: WebSocket,
  _req: IncomingMessage,
  sessionManager: VoiceSessionManager
): void {
  let session: VoiceSession | null = null;

  ws.on("message", async (data) => {
    const raw = data.toString();

    // First message is always "connected", next is "start" with custom params
    if (!session) {
      try {
        const parsed = JSON.parse(raw) as { event: string; start?: { callSid: string; customParameters: Record<string, string> } };

        if (parsed.event === "connected") {
          logger.info("New Twilio Media Stream connection");
          return;
        }

        if (parsed.event === "start" && parsed.start) {
          const { callSid, customParameters } = parsed.start;
          const businessId = customParameters.businessId ?? "vividerm";

          // Validate businessId before proceeding
          let business, knowledgeBase;
          try {
            business = getBusinessConfig(businessId);
            knowledgeBase = getKnowledgeBase(businessId);
          } catch {
            logger.warn({ businessId }, "Rejected connection: unknown businessId");
            ws.close(1008, "Unknown business");
            return;
          }
          const voiceConfig = getDefaultVoiceConfig(businessId);

          session = new VoiceSession({
            callSid,
            ws,
            business,
            knowledgeBase,
            voiceConfig,
            anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
            deepgramApiKey: process.env.DEEPGRAM_API_KEY!,
            elevenlabsApiKey: process.env.ELEVENLABS_API_KEY!,
          });

          sessionManager.add(callSid, session);

          // Forward the start event to session
          await session.handleTwilioMessage(raw);
          return;
        }
      } catch (err) {
        logger.error({ err }, "Error parsing initial Twilio message");
        return;
      }
    }

    // Forward all subsequent messages to the session
    const activeSession = session;
    if (!activeSession) return;
    try {
      await activeSession.handleTwilioMessage(raw);
    } catch (err) {
      logger.error({ err }, "Error handling Twilio message");
    }
  });

  ws.on("close", () => {
    if (session) {
      const callSid = session.sessionState.callSid;
      void sessionManager.remove(callSid).catch((err) => {
        logger.error({ err, callSid }, "Error removing session on close");
      });
    }
  });

  ws.on("error", (err) => {
    logger.error({ err }, "WebSocket error");
  });
}
