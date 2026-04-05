import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConversationEngine } from "@ai-receptionist/core";
import { vividermConfig, vividermKnowledgeBase } from "@ai-receptionist/config";
import type { SupportedLanguage, ConversationChannel } from "@ai-receptionist/types";
import { conversationStore } from "@/lib/conversation-store";
import { isAfterHours, generateId } from "@/lib/utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { triggerEscalation } from "@/lib/escalation";
import { createBookingRequest, notifyStaffOfBooking } from "@/lib/booking";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("chat");

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
  const requestOrigin = request.headers.get("origin");

  // Rate limit: 20 messages per minute per IP
  const clientIp = getClientIp(request.headers);
  const rateLimitResult = rateLimit(`chat:${clientIp}`, 20, 60_000);

  if (!rateLimitResult.success) {
    const resp = jsonResponse(
      { success: false, data: null, error: "Too many requests. Please wait a moment." },
      429,
      requestOrigin
    );
    resp.headers.set("Retry-After", String(Math.ceil(rateLimitResult.resetMs / 1000)));
    resp.headers.set("X-RateLimit-Remaining", "0");
    return resp;
  }

  try {
    const body = await request.json();
    const parsed = messageSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(
        { success: false, data: null, error: "Invalid request body" },
        400,
        requestOrigin
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

    // Trigger escalation if needed (async, non-blocking)
    if (response.shouldEscalate) {
      void triggerEscalation(
        {
          businessId: session.businessId,
          conversationId: session.id,
          reason: (response.escalationReason ?? "customer_request") as import("@ai-receptionist/types").EscalationReason,
          customerName: session.lead.name,
          customerPhone: session.lead.phone,
          summary: message,
          language: response.language,
          channel: session.channel,
        },
        business
      ).catch(() => {});
    }

    // Handle booking intent (async, non-blocking)
    let bookingResult: { success: boolean; bookingId?: string } | null = null;
    if (response.shouldBook && session.lead.name && session.lead.phone) {
      const bookingRequest = {
        conversationId: session.id,
        customerName: session.lead.name,
        customerPhone: session.lead.phone,
        customerEmail: session.lead.email,
        service: response.bookingDetails?.service ?? session.lead.interests?.[0] ?? "Consultation",
        preferredDate: response.bookingDetails?.date,
        preferredTime: response.bookingDetails?.time,
        notes: `AI-booked via ${session.channel}. Language: ${response.language}`,
      };

      bookingResult = await createBookingRequest(bookingRequest).catch(() => null);

      // Notify staff about the booking request
      if (business.escalation.contacts[0]?.phone) {
        void notifyStaffOfBooking(
          bookingRequest,
          business.escalation.contacts[0].phone
        ).catch(() => {});
      }
    }

    return jsonResponse(
      {
        success: true,
        data: {
          conversationId: session.id,
          message: response.message,
          language: response.language,
          intent: response.intent.intent,
          shouldEscalate: response.shouldEscalate,
          escalationReason: response.escalationReason,
          bookingCreated: bookingResult?.success ?? false,
          bookingId: bookingResult?.bookingId ?? null,
        },
        error: null,
      },
      200,
      requestOrigin
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ err: errorMessage }, "Chat API error");

    // Detect billing/credit errors so admin knows to add credits
    const isBillingError = errorMessage.includes("credit balance")
      || errorMessage.includes("billing")
      || errorMessage.includes("rate_limit");

    const userFacingMessage = isBillingError
      ? "Our AI assistant is temporarily unavailable. Please call us at +371 23 444 401 or try again later."
      : "An error occurred processing your message. Please try again or call +371 23 444 401.";

    return jsonResponse(
      {
        success: false,
        data: null,
        error: userFacingMessage,
        _debug: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      500,
      requestOrigin
    );
  }
}

// CORS headers for widget embedding
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? "*").split(",").map((o) => o.trim());

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin =
    ALLOWED_ORIGINS.includes("*")
      ? "*"
      : ALLOWED_ORIGINS.includes(requestOrigin ?? "")
        ? requestOrigin!
        : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(body: unknown, status = 200, requestOrigin: string | null = null): NextResponse {
  return NextResponse.json(body, { status, headers: getCorsHeaders(requestOrigin) });
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) });
}
