import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ConversationEngine } from "@ai-receptionist/core";
import { getBusinessConfig, getKnowledgeBase, findServiceExternalId } from "@ai-receptionist/config";
import type { SupportedLanguage, ConversationChannel } from "@ai-receptionist/types";
import { conversationStore } from "@/lib/conversation-store";
import { isAfterHours, generateId } from "@/lib/utils";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { triggerEscalation } from "@/lib/escalation";
import { createBookingRequest, getAvailableSlots, notifyStaffOfBooking } from "@/lib/booking";
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

    let business;
    let knowledgeBase;
    try {
      business = getBusinessConfig(businessId);
      knowledgeBase = getKnowledgeBase(businessId);
    } catch {
      return jsonResponse(
        { success: false, data: null, error: "Unknown business" },
        404,
        requestOrigin
      );
    }

    // Get or create conversation session
    const afterHours = isAfterHours(business.hours, business.timezone);
    let session = conversationId
      ? await conversationStore.getOrLoad(conversationId, afterHours)
      : undefined;

    if (!session) {
      conversationId = generateId();
      try {
        session = await conversationStore.create({
          id: conversationId,
          businessSlug: businessId,
          channel: channel as ConversationChannel,
          language: language as SupportedLanguage,
          isAfterHours: afterHours,
        });
      } catch (err) {
        log.error({ err }, "Failed to create conversation");
        return jsonResponse(
          { success: false, data: null, error: "Service temporarily unavailable. Please try again." },
          503,
          requestOrigin
        );
      }
    }

    // Store user message
    const userMessage = {
      id: generateId(),
      role: "user" as const,
      content: message,
      language: session.language,
      timestamp: new Date(),
    };
    await conversationStore.addMessage(session.id, userMessage).catch((err) => {
      log.error({ err, sessionId: session.id }, "Failed to persist user message");
    });

    // Process with AI engine
    const response = await engine.processMessage(
      message,
      {
        id: session.id,
        businessId: session.businessSlug,
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
    await conversationStore.addMessage(session.id, assistantMessage).catch((err) => {
      log.error({ err, sessionId: session.id }, "Failed to persist assistant message");
    });

    // Update session state (non-critical — log errors but don't fail the request)
    if (response.language !== session.language) {
      await conversationStore.updateLanguage(session.id, response.language).catch((err) => {
        log.error({ err, sessionId: session.id }, "Failed to update language");
      });
    }
    if (response.leadUpdate) {
      await conversationStore.updateLead(session.id, response.leadUpdate).catch((err) => {
        log.error({ err, sessionId: session.id }, "Failed to update lead");
      });
    }
    await conversationStore.addIntent(session.id, response.intent).catch((err) => {
      log.error({ err, sessionId: session.id }, "Failed to persist intent");
    });

    // Trigger escalation if needed (async, non-blocking)
    if (response.shouldEscalate) {
      void triggerEscalation(
        {
          businessId: session.businessSlug,
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

    // Handle booking intent
    let bookingResult: { success: boolean; bookingId?: string } | null = null;
    let availableSlots: import("@ai-receptionist/types").BookingSlot[] = [];

    const isBookingIntent = response.intent.intent === "book_appointment"
      || response.intent.intent === "booking_confirm";

    if (isBookingIntent && business.bookingSystem) {
      const serviceName = response.bookingDetails?.service
        ?? session.lead.interests?.[0]
        ?? "Consultation";

      // Fetch available slots for context (non-blocking on failure)
      const companyId = business.bookingSystem.calendarId;
      if (companyId) {
        const serviceExternalId = findServiceExternalId(businessId, serviceName) ?? undefined;
        availableSlots = await getAvailableSlots(
          companyId,
          serviceExternalId,
          undefined,
          response.bookingDetails?.date
        ).catch(() => []);
      }

      // Only create booking when we have confirmed details + lead info
      const hasLeadInfo = session.lead.name && session.lead.phone;
      const hasConfirmedSlot = response.bookingDetails?.date || response.bookingDetails?.time;
      const isConfirmed = response.intent.intent === "booking_confirm"
        || (response.shouldBook && hasConfirmedSlot);

      if (isConfirmed && hasLeadInfo) {
        const bookingRequest = {
          conversationId: session.id,
          customerName: session.lead.name!,
          customerPhone: session.lead.phone!,
          customerEmail: session.lead.email,
          service: serviceName,
          preferredDate: response.bookingDetails?.date,
          preferredTime: response.bookingDetails?.time,
          notes: `AI-booked via ${session.channel}. Language: ${response.language}`,
        };

        bookingResult = await createBookingRequest(bookingRequest, businessId).catch(() => null);

        // Notify staff about the booking request
        if (business.escalation.contacts[0]?.phone) {
          void notifyStaffOfBooking(
            bookingRequest,
            business.escalation.contacts[0].phone
          ).catch(() => {});
        }
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
          availableSlots: availableSlots.length > 0
            ? availableSlots.slice(0, 5).map((s) => ({
                datetime: s.datetime.toISOString(),
                duration: s.duration,
                specialist: s.specialist,
              }))
            : undefined,
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
