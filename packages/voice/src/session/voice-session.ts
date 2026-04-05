// ============================================
// VoiceSession — Per-call orchestrator
// Manages the STT -> AI -> TTS pipeline for one call.
// ============================================

import { randomUUID } from "crypto";
import type WebSocket from "ws";
import type { BusinessConfig, KnowledgeBase, ConversationMessage } from "@ai-receptionist/types";
import { DeepgramClient } from "../stt/deepgram-client";
import type { STTEvent } from "../stt/stt-types";
import { ElevenLabsClient } from "../tts/elevenlabs-client";
import type { TTSEvent } from "../tts/tts-types";
import { StreamingEngineAdapter, type ConversationState } from "../engine/streaming-engine-adapter";
import { BargeInDetector } from "../barge-in/barge-in-detector";
import { pcm16ToMulaw } from "../audio/mulaw-codec";
import { resample } from "../audio/resampler";
import {
  parseTwilioEvent,
  createMediaMessage,
  createClearMessage,
  type TwilioStartEvent,
} from "../twilio/media-stream-protocol";
import type { BusinessVoiceConfig } from "../config/voice-config";
import {
  createInitialState,
  updateState,
  type VoiceSessionState,
} from "./voice-session-state";
import { createSessionLogger } from "../utils/logger";

export class VoiceSession {
  private state: VoiceSessionState;
  private readonly ws: WebSocket;
  private readonly business: BusinessConfig;
  private readonly knowledgeBase: KnowledgeBase;
  private readonly voiceConfig: BusinessVoiceConfig;

  private readonly stt: DeepgramClient;
  private readonly tts: ElevenLabsClient;
  private readonly engine: StreamingEngineAdapter;
  private readonly bargeIn: BargeInDetector;
  private readonly log: ReturnType<typeof createSessionLogger>;
  private readonly deepgramApiKey: string;
  private readonly elevenlabsApiKey: string;

  private static readonly MAX_UTTERANCE_BUFFER = 2000;
  private currentAbortController: AbortController | null = null;
  private utteranceBuffer = "";

  constructor(params: {
    callSid: string;
    ws: WebSocket;
    business: BusinessConfig;
    knowledgeBase: KnowledgeBase;
    voiceConfig: BusinessVoiceConfig;
    anthropicApiKey: string;
    deepgramApiKey: string;
    elevenlabsApiKey: string;
  }) {
    this.ws = params.ws;
    this.business = params.business;
    this.knowledgeBase = params.knowledgeBase;
    this.voiceConfig = params.voiceConfig;

    this.state = createInitialState({
      callSid: params.callSid,
      streamSid: "",
      businessId: params.business.id,
      callerPhone: "",
    });

    this.log = createSessionLogger(params.callSid);
    this.deepgramApiKey = params.deepgramApiKey;
    this.elevenlabsApiKey = params.elevenlabsApiKey;

    this.stt = new DeepgramClient();
    this.tts = new ElevenLabsClient();
    this.engine = new StreamingEngineAdapter({
      anthropicApiKey: params.anthropicApiKey,
    });
    this.bargeIn = new BargeInDetector(params.voiceConfig.bargeIn);

    this.setupSTTHandlers();
    this.setupTTSHandlers();
    this.setupBargeInHandler();
  }

  /** Handle a raw WebSocket message from Twilio. */
  async handleTwilioMessage(raw: string): Promise<void> {
    const event = parseTwilioEvent(raw);

    switch (event.event) {
      case "connected":
        this.log.info("Twilio Media Stream connected");
        break;

      case "start":
        await this.handleStart(event);
        break;

      case "media":
        if (event.media.track === "inbound") {
          const audioBytes = Buffer.from(event.media.payload, "base64");
          this.stt.sendAudio(audioBytes);
        }
        break;

      case "stop":
        this.log.info("Twilio Media Stream stopped");
        await this.destroy();
        break;

      case "mark":
        this.log.debug({ mark: event.mark.name }, "Twilio mark received");
        break;
    }
  }

  /** Clean up all resources. */
  async destroy(): Promise<void> {
    this.state = updateState(this.state, { phase: "ended" });
    this.currentAbortController?.abort();
    this.stt.close();
    this.tts.close();
    this.log.info(
      {
        turns: this.state.metrics.turnCount,
        totalLatencyMs: this.state.metrics.totalLatencyMs,
        bargeIns: this.state.metrics.bargeInCount,
      },
      "Voice session ended"
    );
  }

  get sessionState(): VoiceSessionState {
    return this.state;
  }

  // --- Private: Initialization ---

  private async handleStart(event: TwilioStartEvent): Promise<void> {
    const { streamSid, callSid, customParameters } = event.start;
    const callerPhone = customParameters.callerPhone ?? "";

    this.state = updateState(this.state, {
      streamSid,
      callerPhone,
      phase: "greeting",
    });

    const maskedPhone = callerPhone.length > 4
      ? callerPhone.slice(0, -4).replace(/\d/g, "*") + callerPhone.slice(-4)
      : "****";
    this.log.info({ streamSid, callSid, callerPhone: maskedPhone }, "Stream started");

    // Connect to Deepgram
    try {
      await this.stt.connect({
        apiKey: this.deepgramApiKey,
        model: this.voiceConfig.stt.model,
        language: this.state.language,
        encoding: "mulaw",
        sampleRate: 8000,
        interimResults: true,
        endpointingMs: this.voiceConfig.stt.endpointingMs,
        utteranceEndMs: this.voiceConfig.stt.utteranceEndMs,
      });
      this.log.info("Deepgram connected");
    } catch (err) {
      this.log.error({ err }, "Failed to connect Deepgram");
    }

    // Connect to ElevenLabs
    const voiceId =
      this.voiceConfig.tts.voiceIds[this.state.language] ??
      process.env.ELEVENLABS_VOICE_ID_EN;

    if (voiceId) {
      try {
        await this.tts.connect({
          apiKey: this.elevenlabsApiKey,
          voiceId,
          model: this.voiceConfig.tts.model,
          outputFormat: this.voiceConfig.tts.outputFormat,
          stability: this.voiceConfig.tts.stability,
          similarityBoost: this.voiceConfig.tts.similarityBoost,
        });
        this.log.info("ElevenLabs connected");
      } catch (err) {
        this.log.error({ err }, "Failed to connect ElevenLabs");
      }
    }

    // Play greeting via TTS
    const greeting =
      this.business.aiPersona.greeting[this.state.language] ??
      this.business.aiPersona.greeting.en;

    if (this.tts.isConnected) {
      this.tts.sendText(greeting);
      this.tts.flush();
    }

    this.state = updateState(this.state, { phase: "listening" });
  }

  // --- Private: STT Handlers ---

  private setupSTTHandlers(): void {
    this.stt.onEvent((event: STTEvent) => {
      switch (event.type) {
        case "transcript_interim":
          if (this.state.phase === "responding") {
            this.bargeIn.onInterimTranscript(event.text);
          }
          if (this.state.phase === "listening") {
            this.utteranceBuffer = event.text.slice(0, VoiceSession.MAX_UTTERANCE_BUFFER);
          }
          break;

        case "transcript_final":
          if (event.text.trim()) {
            this.log.info({ text: event.text, confidence: event.confidence }, "Final transcript");
            this.utteranceBuffer = "";
            void this.processUtterance(event.text).catch((err) => {
              this.log.error({ err }, "Error processing final transcript");
            });
          }
          break;

        case "utterance_end":
          if (this.utteranceBuffer.trim() && this.state.phase === "listening") {
            const text = this.utteranceBuffer;
            this.utteranceBuffer = "";
            void this.processUtterance(text).catch((err) => {
              this.log.error({ err }, "Error processing utterance end");
            });
          }
          break;

        case "error":
          this.log.error({ message: event.message }, "STT error");
          break;

        case "closed":
          this.log.info({ code: event.code }, "STT connection closed");
          break;
      }
    });
  }

  // --- Private: TTS Handlers ---

  private setupTTSHandlers(): void {
    this.tts.onEvent((event: TTSEvent) => {
      switch (event.type) {
        case "audio":
          this.sendAudioToTwilio(event.data);
          break;
        case "flush":
          this.log.debug("TTS flush — sentence complete");
          break;
        case "error":
          this.log.error({ message: event.message }, "TTS error");
          break;
        case "closed":
          this.log.debug("TTS connection closed");
          break;
      }
    });
  }

  // --- Private: Barge-In ---

  private setupBargeInHandler(): void {
    this.bargeIn.onBargeIn(() => {
      this.log.info("Barge-in detected — cancelling response");

      // Clear Twilio audio queue
      if (this.state.streamSid) {
        this.sendToTwilio(createClearMessage(this.state.streamSid));
      }

      // Abort current Claude stream
      this.currentAbortController?.abort();

      // Stop TTS and reconnect for next response
      void Promise.resolve(this.tts.stop()).catch((err) => {
        this.log.error({ err }, "Error reconnecting TTS after barge-in");
      });

      this.state = updateState(this.state, {
        phase: "interrupted",
        metrics: {
          ...this.state.metrics,
          bargeInCount: this.state.metrics.bargeInCount + 1,
        },
      });
    });
  }

  // --- Private: AI Processing ---

  private async processUtterance(text: string): Promise<void> {
    if (this.state.phase === "processing" || this.state.phase === "ended") return;

    this.state = updateState(this.state, { phase: "processing" });
    const turnStartMs = Date.now();

    // Add user message to history
    const userMessage: ConversationMessage = {
      id: `msg-${randomUUID()}`,
      role: "user",
      content: text,
      language: this.state.language,
      timestamp: new Date(),
    };

    const conversationState: ConversationState = {
      id: this.state.callSid,
      businessId: this.state.businessId,
      channel: "voice",
      language: this.state.language,
      messages: [...this.state.messages],
      lead: this.state.lead,
      detectedIntents: [...this.state.detectedIntents],
      isAfterHours: this.state.isAfterHours,
      createdAt: this.state.createdAt,
    };

    this.currentAbortController = new AbortController();

    try {
      this.state = updateState(this.state, { phase: "responding" });
      this.bargeIn.startMonitoring();

      const generator = this.engine.processMessageStreaming(
        text,
        conversationState,
        this.business,
        this.knowledgeBase,
        this.currentAbortController.signal
      );

      let sentenceBuffer = "";
      let result;

      // Stream text chunks to TTS at sentence boundaries
      while (true) {
        const { value, done } = await generator.next();
        if (done) {
          result = value;
          break;
        }
        if (this.state.phase === "interrupted") break;

        sentenceBuffer += value;

        // Send to TTS at sentence boundaries
        const sentenceEnd = sentenceBuffer.search(/[.!?]\s/);
        if (sentenceEnd !== -1) {
          const sentence = sentenceBuffer.substring(0, sentenceEnd + 1);
          sentenceBuffer = sentenceBuffer.substring(sentenceEnd + 1).trimStart();
          if (this.tts.isConnected) {
            this.tts.sendText(sentence);
          }
        }
      }

      // Flush remaining text
      if (sentenceBuffer.trim() && this.tts.isConnected) {
        this.tts.sendText(sentenceBuffer);
        this.tts.flush();
      }

      this.bargeIn.stopMonitoring();

      // Update state with AI response
      if (result) {
        const assistantMessage: ConversationMessage = {
          id: `msg-${randomUUID()}`,
          role: "assistant",
          content: result.message,
          language: result.language,
          timestamp: new Date(),
        };

        const latencyMs = Date.now() - turnStartMs;

        this.state = updateState(this.state, {
          phase: "listening",
          language: result.language,
          messages: [...this.state.messages, userMessage, assistantMessage],
          lead: result.leadUpdate
            ? { ...this.state.lead, ...result.leadUpdate }
            : this.state.lead,
          detectedIntents: [...this.state.detectedIntents, result.intent],
          metrics: {
            ...this.state.metrics,
            turnCount: this.state.metrics.turnCount + 1,
            totalLatencyMs: this.state.metrics.totalLatencyMs + latencyMs,
          },
        });

        this.log.info(
          {
            intent: result.intent.intent,
            language: result.language,
            latencyMs,
            shouldEscalate: result.shouldEscalate,
          },
          "Turn complete"
        );
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        this.log.info("Claude stream aborted (barge-in)");
      } else {
        this.log.error({ err }, "Error processing utterance");
      }
      this.state = updateState(this.state, { phase: "listening" });
    } finally {
      this.currentAbortController = null;
    }
  }

  // --- Private: Audio Output ---

  private sendAudioToTwilio(pcmData: Buffer): void {
    if (this.state.phase === "ended") return;

    // Resample from TTS output rate (16kHz) to Twilio (8kHz)
    const resampled = resample(pcmData, 16000, 8000);

    // Convert PCM16 to mulaw
    const mulaw = pcm16ToMulaw(resampled);

    // Send as base64-encoded media event
    const payload = mulaw.toString("base64");
    this.sendToTwilio(createMediaMessage(this.state.streamSid, payload));
  }

  private sendToTwilio(message: string): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(message);
    }
  }
}
