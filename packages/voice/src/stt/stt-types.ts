// ============================================
// Speech-to-Text Types
// ============================================

import type { SupportedLanguage } from "@ai-receptionist/types";

export interface STTConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly language: SupportedLanguage;
  readonly encoding: "mulaw" | "linear16";
  readonly sampleRate: number;
  readonly interimResults: boolean;
  readonly endpointingMs: number;
  readonly utteranceEndMs: number;
}

export type STTEvent =
  | { readonly type: "transcript_interim"; readonly text: string; readonly confidence: number }
  | { readonly type: "transcript_final"; readonly text: string; readonly confidence: number; readonly durationMs: number }
  | { readonly type: "utterance_end" }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "closed"; readonly code: number; readonly reason: string };

export interface STTClient {
  connect(config: STTConfig): Promise<void>;
  sendAudio(audio: Buffer): void;
  onEvent(handler: (event: STTEvent) => void): void;
  close(): void;
  readonly isConnected: boolean;
}
