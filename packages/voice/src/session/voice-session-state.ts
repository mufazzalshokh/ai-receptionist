// ============================================
// Voice Session State (Immutable)
// ============================================

import type {
  SupportedLanguage,
  ConversationMessage,
  DetectedIntent,
  LeadData,
} from "@ai-receptionist/types";

export type VoiceSessionPhase =
  | "connecting"
  | "greeting"
  | "listening"
  | "processing"
  | "responding"
  | "interrupted"
  | "escalating"
  | "ended";

export interface VoiceSessionMetrics {
  readonly turnCount: number;
  readonly totalLatencyMs: number;
  readonly bargeInCount: number;
}

export interface VoiceSessionState {
  readonly callSid: string;
  readonly streamSid: string;
  readonly businessId: string;
  readonly callerPhone: string;
  readonly language: SupportedLanguage;
  readonly phase: VoiceSessionPhase;
  readonly messages: readonly ConversationMessage[];
  readonly lead: Partial<LeadData>;
  readonly detectedIntents: readonly DetectedIntent[];
  readonly isAfterHours: boolean;
  readonly createdAt: Date;
  readonly metrics: VoiceSessionMetrics;
}

export function createInitialState(params: {
  callSid: string;
  streamSid: string;
  businessId: string;
  callerPhone: string;
}): VoiceSessionState {
  return {
    callSid: params.callSid,
    streamSid: params.streamSid,
    businessId: params.businessId,
    callerPhone: params.callerPhone,
    language: "en",
    phase: "connecting",
    messages: [],
    lead: {},
    detectedIntents: [],
    isAfterHours: false,
    createdAt: new Date(),
    metrics: {
      turnCount: 0,
      totalLatencyMs: 0,
      bargeInCount: 0,
    },
  };
}

/** Immutable state update — returns a new state object. */
export function updateState(
  state: VoiceSessionState,
  updates: Partial<VoiceSessionState>
): VoiceSessionState {
  return { ...state, ...updates };
}
