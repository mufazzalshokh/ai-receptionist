// ============================================
// ElevenLabs WebSocket Streaming TTS Client
// ============================================

import WebSocket from "ws";
import type { TTSConfig, TTSEvent, TTSProvider } from "./tts-types";

const ELEVENLABS_WS_URL = "wss://api.elevenlabs.io/v1/text-to-speech";

interface ElevenLabsAudioMessage {
  readonly audio?: string; // base64-encoded audio chunk
  readonly isFinal?: boolean;
  readonly normalizedAlignment?: unknown;
  readonly error?: string;
}

export class ElevenLabsClient implements TTSProvider {
  private ws: WebSocket | null = null;
  private eventHandler: ((event: TTSEvent) => void) | null = null;
  private lastConfig: TTSConfig | null = null;

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(config: TTSConfig): Promise<void> {
    this.lastConfig = config;

    const params = new URLSearchParams({
      model_id: config.model,
      output_format: config.outputFormat,
    });

    const url = `${ELEVENLABS_WS_URL}/${config.voiceId}/stream-input?${params.toString()}`;

    return new Promise((resolve, reject) => {
      let settled = false;

      this.ws = new WebSocket(url, {
        headers: { "xi-api-key": config.apiKey },
      });

      this.ws.on("open", () => {
        // Send initial config message (BOS — beginning of stream)
        this.ws!.send(
          JSON.stringify({
            text: " ",
            voice_settings: {
              stability: config.stability,
              similarity_boost: config.similarityBoost,
            },
            generation_config: {
              chunk_length_schedule: [120, 160, 250, 290],
            },
          })
        );
        if (!settled) { settled = true; resolve(); }
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on("close", () => {
        this.emit({ type: "closed" });
      });

      this.ws.on("error", (err) => {
        this.emit({ type: "error", message: err.message });
        if (!settled) { settled = true; reject(err); }
      });
    });
  }

  sendText(text: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text, try_trigger_generation: true }));
    }
  }

  flush(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // EOS — end of stream, flush remaining audio
      this.ws.send(JSON.stringify({ text: "" }));
    }
  }

  async stop(): Promise<void> {
    // Close current stream and reconnect for next response
    this.close();
    if (this.lastConfig) {
      await this.connect(this.lastConfig);
    }
  }

  onEvent(handler: (event: TTSEvent) => void): void {
    this.eventHandler = handler;
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(data: WebSocket.Data): void {
    let msg: ElevenLabsAudioMessage;
    try {
      msg = JSON.parse(data.toString()) as ElevenLabsAudioMessage;
    } catch {
      this.emit({ type: "error", message: "Invalid JSON from ElevenLabs" });
      return;
    }

    if (msg.error) {
      this.emit({ type: "error", message: msg.error });
      return;
    }

    if (msg.audio) {
      this.emit({
        type: "audio",
        data: Buffer.from(msg.audio, "base64"),
      });
    }

    if (msg.isFinal) {
      this.emit({ type: "flush" });
    }
  }

  private emit(event: TTSEvent): void {
    this.eventHandler?.(event);
  }
}
