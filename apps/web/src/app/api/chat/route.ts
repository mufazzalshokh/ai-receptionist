import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConversationEngine } from "@ai-receptionist/core";
import { vividermConfig, vividermKnowledgeBase } from "@ai-receptionist/config";
import type { SupportedLanguage, ConversationChannel } from "@ai-receptionist/types";
import { conversationStore } from "@/lib/conversation-store";
import { isAfterHours, generateId } from "@/lib/utils";

const engine = new ConversationEngine({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

const messageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(2000),
  language: z.enum(["en", "lv", "ru"]).optional(),
  channel: z.enum(["chat", "voice", "sms", "whatsapp"]).optional(),
  businessId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = messageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      message,
      language = "en",
      channel = "chat",
      businessId = "vividerm",
    } = parsed.data;
    let { conversationId } = parsed.data;

    // For MVP: only VividDerm config exists
    const business = vividermConfig;
    const knowledgeBase = vividermKnowledgeBase;

    // Get or create conversation session
    let session = conversationId
      ? conversationStore.get(conversationId)
      : undefined;

    if (!session) {
      conversationId = generateId();
      session = conversationStore.create({
        id: conversationId,
        businessId,
        channel: channel as ConversationChannel,
        language: language as SupportedLanguage,
        isAfterHours: isAfterHours(business.hours, business.timezone),
      });
    }

    // Store user message
    const userMessage = {
      id: generateId(),
      role: "user" as const,
      content: message,
      language: session.language,
      timestamp: new Date(),
    };
    conversationStore.addMessage(session.id, userMessage);

    // Process with AI engine
    const response = await engine.processMessage(
      message,
      {
        id: session.id,
        businessId: session.businessId,
        channel: session.channel,
        language: session.language,
        messages: session.messages,
        lead: session.lead,
        detectedIntents: session.detectedIntents,
        isAfterHours: session.isAfterHours,
        createdAt: session.createdAt,
      },
      business,
      knowledgeBase
    );

    // Store assistant message
    const assistantMessage = {
      id: generateId(),
      role: "assistant" as const,
      content: response.message,
      language: response.language,
      timestamp: new Date(),
      metadata: {
        intent: response.intent,
        tokensUsed: response.tokensUsed,
      },
    };
    conversationStore.addMessage(session.id, assistantMessage);

    // Update session state
    if (response.language !== session.language) {
      conversationStore.updateLanguage(session.id, response.language);
    }
    if (response.leadUpdate) {
      conversationStore.updateLead(session.id, response.leadUpdate);
    }
    conversationStore.addIntent(session.id, response.intent);

    return NextResponse.json({
      success: true,
      data: {
        conversationId: session.id,
        message: response.message,
        language: response.language,
        intent: response.intent.intent,
        shouldEscalate: response.shouldEscalate,
        escalationReason: response.escalationReason,
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Chat API error:", errorMessage);

    // Detect billing/credit errors so admin knows to add credits
    const isBillingError = errorMessage.includes("credit balance")
      || errorMessage.includes("billing")
      || errorMessage.includes("rate_limit");

    const userFacingMessage = isBillingError
      ? "Our AI assistant is temporarily unavailable. Please call us at +371 23 444 401 or try again later."
      : "An error occurred processing your message. Please try again or call +371 23 444 401.";

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: userFacingMessage,
        _debug: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
