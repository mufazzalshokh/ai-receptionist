// ============================================
// Deepgram Real-Time STT Client
// Connects via WebSocket for streaming transcription.
// ============================================

import WebSocket from "ws";
import type { STTClient, STTConfig, STTEvent } from "./stt-types";

interface DeepgramResult {
  readonly is_final: boolean;
  readonly speech_final: boolean;
  readonly channel: {
    readonly alternatives: readonly {
      readonly transcript: string;
      readonly confidence: number;
    }[];
  };
  readonly duration: number;
  readonly start: number;
}

interface DeepgramResponse {
  readonly type: string;
  readonly channel_index?: readonly number[];
  readonly channel?: DeepgramResult["channel"];
  readonly is_final?: boolean;
  readonly speech_final?: boolean;
  readonly duration?: number;
  readonly start?: number;
}

const DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen";

const LANGUAGE_MAP: Record<string, string> = {
  en: "en-US",
  lv: "lv",
  ru: "ru",
};

export class DeepgramClient implements STTClient {
  private ws: WebSocket | null = null;
  private eventHandler: ((event: STTEvent) => void) | null = null;

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(config: STTConfig): Promise<void> {
    const language = LANGUAGE_MAP[config.language] ?? "en-US";

    const params = new URLSearchParams({
      model: config.model,
      language,
      encoding: config.encoding,
      sample_rate: String(config.sampleRate),
      channels: "1",
      interim_results: String(config.interimResults),
      endpointing: String(config.endpointingMs),
      utterance_end_ms: String(config.utteranceEndMs),
      punctuate: "true",
      smart_format: "true",
    });

    const url = `${DEEPGRAM_WS_URL}?${params.toString()}`;

    return new Promise((resolve, reject) => {
      let settled = false;

      this.ws = new WebSocket(url, {
        headers: { Authorization: `Token ${config.apiKey}` },
      });

      this.ws.on("open", () => {
        if (!settled) { settled = true; resolve(); }
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on("close", (code, reason) => {
        this.emit({
          type: "closed",
          code,
          reason: reason.toString(),
        });
      });

      this.ws.on("error", (err) => {
        this.emit({ type: "error", message: err.message });
        if (!settled) { settled = true; reject(err); }
      });
    });
  }

  sendAudio(audio: Buffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audio);
    }
  }

  onEvent(handler: (event: STTEvent) => void): void {
    this.eventHandler = handler;
  }

  close(): void {
    if (this.ws) {
      // Send close frame to Deepgram (empty byte signals end of audio)
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(Buffer.alloc(0));
      }
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(data: WebSocket.Data): void {
    let response: DeepgramResponse;
    try {
      response = JSON.parse(data.toString()) as DeepgramResponse;
    } catch {
      this.emit({ type: "error", message: "Invalid JSON from Deepgram" });
      return;
    }

    if (response.type === "UtteranceEnd") {
      this.emit({ type: "utterance_end" });
      return;
    }

    if (response.type !== "Results" || !response.channel) return;

    const alt = response.channel.alternatives[0];
    if (!alt || !alt.transcript) return;

    if (response.is_final) {
      this.emit({
        type: "transcript_final",
        text: alt.transcript,
        confidence: alt.confidence,
        durationMs: (response.duration ?? 0) * 1000,
      });
    } else {
      this.emit({
        type: "transcript_interim",
        text: alt.transcript,
        confidence: alt.confidence,
      });
    }
  }

  private emit(event: STTEvent): void {
    this.eventHandler?.(event);
  }
}
