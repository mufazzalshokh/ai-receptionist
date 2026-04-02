// ============================================
// Streaming Engine Adapter
// Wraps ConversationEngine for streaming Claude responses.
// Yields text chunks as they arrive from the API,
// then runs post-processing (intent, lead, escalation)
// on the full assembled text.
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import type {
  BusinessConfig,
  KnowledgeBase,
  ConversationChannel,
  ConversationMessage,
  SupportedLanguage,
  DetectedIntent,
  LeadData,
} from "@ai-receptionist/types";
import {
  SystemPromptBuilder,
  IntentDetector,
  LanguageDetector,
  LeadQualifier,
} from "@ai-receptionist/core";

export interface ConversationState {
  readonly id: string;
  readonly businessId: string;
  readonly channel: ConversationChannel;
  readonly language: SupportedLanguage;
  readonly messages: ConversationMessage[];
  readonly lead: Partial<LeadData>;
  readonly detectedIntents: DetectedIntent[];
  readonly isAfterHours: boolean;
  readonly createdAt: Date;
}

export interface StreamingEngineConfig {
  readonly anthropicApiKey: string;
  readonly model?: string;
  readonly maxTokens?: number;
}

export interface StreamingResult {
  readonly message: string;
  readonly language: SupportedLanguage;
  readonly intent: DetectedIntent;
  readonly leadUpdate: Partial<LeadData> | null;
  readonly shouldEscalate: boolean;
  readonly escalationReason?: string;
  readonly shouldBook: boolean;
  readonly tokensUsed: { input: number; output: number };
}

export class StreamingEngineAdapter {
  private readonly client: Anthropic;
  private readonly promptBuilder: SystemPromptBuilder;
  private readonly intentDetector: IntentDetector;
  private readonly languageDetector: LanguageDetector;
  private readonly leadQualifier: LeadQualifier;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: StreamingEngineConfig) {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    this.promptBuilder = new SystemPromptBuilder();
    this.intentDetector = new IntentDetector();
    this.languageDetector = new LanguageDetector();
    this.leadQualifier = new LeadQualifier();
    this.model = config.model ?? "claude-haiku-4-5-20251001";
    this.maxTokens = config.maxTokens ?? 1024;
  }

  /**
   * Process a message with streaming. Returns an async generator that
   * yields text chunks as they arrive. After the generator completes,
   * call getLastResult() for full post-processed result.
   */
  async *processMessageStreaming(
    userMessage: string,
    state: ConversationState,
    business: BusinessConfig,
    knowledgeBase: KnowledgeBase,
    signal?: AbortSignal
  ): AsyncGenerator<string, StreamingResult> {
    // 1. Detect language
    const detectedLanguage = this.languageDetector.detect(
      userMessage,
      business.languages as SupportedLanguage[],
      state.language
    );

    // 2. Detect intent
    const intent = this.intentDetector.detect(userMessage, detectedLanguage);

    // 3. Check escalation
    const shouldEscalate = this.checkEscalation(
      userMessage,
      intent,
      business,
      detectedLanguage
    );

    // 4. Build system prompt
    const systemPrompt = this.promptBuilder.build({
      business,
      knowledgeBase,
      channel: state.channel,
      language: detectedLanguage,
      isAfterHours: state.isAfterHours,
      currentTime: new Date().toLocaleTimeString("en-US", {
        timeZone: business.timezone,
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    // 5. Build messages
    const messages: Anthropic.MessageParam[] = state.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    messages.push({ role: "user", content: userMessage });

    // 6. Stream from Claude
    let fullText = "";
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages,
    });

    // Allow abort via signal
    if (signal) {
      signal.addEventListener("abort", () => stream.abort(), { once: true });
    }

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullText += event.delta.text;
        yield event.delta.text;
      }
    }

    // Get usage from final message
    const finalMessage = await stream.finalMessage();
    inputTokens = finalMessage.usage.input_tokens;
    outputTokens = finalMessage.usage.output_tokens;

    // 7. Post-processing on complete text
    const leadUpdate = this.leadQualifier.extractLeadInfo(
      userMessage,
      fullText,
      state.lead
    );

    const shouldBook =
      intent.intent === "book_appointment" && intent.confidence > 0.7;

    return {
      message: fullText,
      language: detectedLanguage,
      intent,
      leadUpdate,
      shouldEscalate,
      escalationReason: shouldEscalate
        ? this.getEscalationReason(intent)
        : undefined,
      shouldBook,
      tokensUsed: { input: inputTokens, output: outputTokens },
    };
  }

  private checkEscalation(
    message: string,
    intent: DetectedIntent,
    business: BusinessConfig,
    language: SupportedLanguage
  ): boolean {
    if (intent.intent === "speak_to_human") return true;
    if (intent.intent === "urgent_medical") return true;

    const urgentKeywords =
      business.escalation.urgentKeywords[language] ?? [];
    const lower = message.toLowerCase();
    if (urgentKeywords.some((kw: string) => lower.includes(kw.toLowerCase())))
      return true;

    if (intent.intent === "complaint" && intent.confidence > 0.8) return true;

    return false;
  }

  private getEscalationReason(intent: DetectedIntent): string {
    const map: Record<string, string> = {
      speak_to_human: "Customer requested to speak with a human",
      urgent_medical: "Urgent medical situation detected",
      complaint: "Customer complaint — needs personal attention",
    };
    return map[intent.intent] ?? "Escalation triggered";
  }
}
