import Anthropic from "@anthropic-ai/sdk";
import type {
  BusinessConfig,
  KnowledgeBase,
  ConversationChannel,
  ConversationMessage,
  SupportedLanguage,
  DetectedIntent,
  LeadData,
  MessageRole,
} from "@ai-receptionist/types";
import { SystemPromptBuilder } from "./prompt-builder";
import { IntentDetector } from "./intent-detector";
import { LanguageDetector } from "./language-detector";
import { LeadQualifier } from "./lead-qualifier";

interface EngineConfig {
  readonly anthropicApiKey: string;
  readonly model?: string;
  readonly maxTokens?: number;
}

interface ConversationState {
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

interface EngineResponse {
  readonly message: string;
  readonly language: SupportedLanguage;
  readonly intent: DetectedIntent;
  readonly leadUpdate: Partial<LeadData> | null;
  readonly shouldEscalate: boolean;
  readonly escalationReason?: string;
  readonly shouldBook: boolean;
  readonly bookingDetails?: Record<string, string>;
  readonly tokensUsed: { input: number; output: number };
}

export class ConversationEngine {
  private readonly client: Anthropic;
  private readonly promptBuilder: SystemPromptBuilder;
  private readonly intentDetector: IntentDetector;
  private readonly languageDetector: LanguageDetector;
  private readonly leadQualifier: LeadQualifier;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: EngineConfig) {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    this.promptBuilder = new SystemPromptBuilder();
    this.intentDetector = new IntentDetector();
    this.languageDetector = new LanguageDetector();
    this.leadQualifier = new LeadQualifier();
    this.model = config.model ?? "claude-sonnet-4-6-20250514";
    this.maxTokens = config.maxTokens ?? 1024;
  }

  async processMessage(
    userMessage: string,
    state: ConversationState,
    business: BusinessConfig,
    knowledgeBase: KnowledgeBase
  ): Promise<EngineResponse> {
    // 1. Detect language
    const detectedLanguage = this.languageDetector.detect(
      userMessage,
      business.languages,
      state.language
    );

    // 2. Detect intent
    const intent = this.intentDetector.detect(userMessage, detectedLanguage);

    // 3. Check for escalation triggers
    const shouldEscalate = this.checkEscalationTriggers(
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

    // 5. Build message history for Claude
    const anthropicMessages = this.buildAnthropicMessages(
      state.messages,
      userMessage
    );

    // 6. Call Claude
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    // 7. Extract lead information from conversation
    const leadUpdate = this.leadQualifier.extractLeadInfo(
      userMessage,
      assistantMessage,
      state.lead
    );

    // 8. Check if booking intent
    const shouldBook =
      intent.intent === "book_appointment" && intent.confidence > 0.7;

    return {
      message: assistantMessage,
      language: detectedLanguage,
      intent,
      leadUpdate,
      shouldEscalate,
      escalationReason: shouldEscalate
        ? this.getEscalationReason(intent, userMessage)
        : undefined,
      shouldBook,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  }

  private buildAnthropicMessages(
    history: readonly ConversationMessage[],
    newUserMessage: string
  ): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = history
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    messages.push({ role: "user", content: newUserMessage });

    return messages;
  }

  private checkEscalationTriggers(
    message: string,
    intent: DetectedIntent,
    business: BusinessConfig,
    language: SupportedLanguage
  ): boolean {
    // Explicit request for human
    if (intent.intent === "speak_to_human") return true;

    // Urgent medical
    if (intent.intent === "urgent_medical") return true;

    // Check urgent keywords
    const urgentKeywords =
      business.escalation.urgentKeywords[language] || [];
    const lowerMessage = message.toLowerCase();
    const hasUrgentKeyword = urgentKeywords.some((kw) =>
      lowerMessage.includes(kw.toLowerCase())
    );

    if (hasUrgentKeyword) return true;

    // Complaint detection
    if (intent.intent === "complaint" && intent.confidence > 0.8) return true;

    return false;
  }

  private getEscalationReason(
    intent: DetectedIntent,
    _message: string
  ): string {
    const reasonMap: Record<string, string> = {
      speak_to_human: "Customer requested to speak with a human",
      urgent_medical: "Urgent medical situation detected",
      complaint: "Customer complaint — needs personal attention",
    };

    return reasonMap[intent.intent] ?? "Escalation triggered";
  }
}
