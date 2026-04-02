// ============================================
// Per-Business Voice Configuration
// ============================================

import type { SupportedLanguage } from "@ai-receptionist/types";

export interface BusinessVoiceConfig {
  readonly businessId: string;
  readonly stt: {
    readonly provider: "deepgram";
    readonly model: string;
    readonly languages: readonly SupportedLanguage[];
    readonly endpointingMs: number;
    readonly utteranceEndMs: number;
  };
  readonly tts: {
    readonly provider: "elevenlabs" | "cartesia";
    readonly voiceIds: Partial<Record<SupportedLanguage, string>>;
    readonly model: string;
    readonly stability: number;
    readonly similarityBoost: number;
    readonly outputFormat: string;
  };
  readonly bargeIn: {
    readonly enabled: boolean;
    readonly minInterruptionDurationMs: number;
  };
}

/** Default voice config — used when business has no custom voice settings. */
export function getDefaultVoiceConfig(businessId: string): BusinessVoiceConfig {
  return {
    businessId,
    stt: {
      provider: "deepgram",
      model: "nova-2",
      languages: ["en", "lv", "ru"],
      endpointingMs: 300,
      utteranceEndMs: 1000,
    },
    tts: {
      provider: "elevenlabs",
      voiceIds: {},
      model: "eleven_turbo_v2_5",
      stability: 0.5,
      similarityBoost: 0.75,
      outputFormat: "pcm_16000",
    },
    bargeIn: {
      enabled: true,
      minInterruptionDurationMs: 150,
    },
  };
}
