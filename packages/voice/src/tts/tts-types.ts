// ============================================
// Text-to-Speech Types
// ============================================

export interface TTSConfig {
  readonly apiKey: string;
  readonly voiceId: string;
  readonly model: string;
  readonly outputFormat: string;
  readonly stability: number;
  readonly similarityBoost: number;
}

export type TTSEvent =
  | { readonly type: "audio"; readonly data: Buffer }
  | { readonly type: "flush" }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "closed" };

export interface TTSProvider {
  connect(config: TTSConfig): Promise<void>;
  sendText(text: string): void;
  flush(): void;
  stop(): void | Promise<void>;
  onEvent(handler: (event: TTSEvent) => void): void;
  close(): void;
  readonly isConnected: boolean;
}
