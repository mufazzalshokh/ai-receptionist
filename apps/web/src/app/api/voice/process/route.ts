import { NextRequest, NextResponse } from "next/server";
import { ConversationEngine } from "@ai-receptionist/core";
import { getBusinessConfig, getKnowledgeBase } from "@ai-receptionist/config";
import { conversationStore } from "@/lib/conversation-store";
import { isAfterHours, generateId } from "@/lib/utils";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("voice-process");

const engine = new ConversationEngine({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

/**
 * Processes speech from Twilio Gather, sends to Claude,
 * responds with TwiML Say, then gathers again for next turn.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const speechResult = formData.get("SpeechResult") as string ?? "";
  const callSid = formData.get("CallSid") as string ?? "";
  const _callerPhone = formData.get("From") as string ?? "unknown";
  const confidence = parseFloat(formData.get("Confidence") as string ?? "0");

  log.info({ speechResult, confidence, callSid }, "Voice speech received");

  if (!speechResult) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I'm sorry, I didn't catch that. Could you please repeat?</Say>
  <Gather input="speech" action="/api/voice/process" method="POST" speechTimeout="auto" language="en-US" enhanced="true">
    <Say voice="Polly.Joanna">I'm listening.</Say>
  </Gather>
</Response>`;
    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  }

  try {
    // Get or create conversation for this call
    const businessSlug = "vividerm"; // TODO: derive from Twilio phone number mapping
    const business = getBusinessConfig(businessSlug);
    const knowledgeBase = getKnowledgeBase(businessSlug);
    const afterHours = isAfterHours(business.hours, business.timezone);
    let session = await conversationStore.getOrLoad(callSid, afterHours);
    if (!session) {
      session = await conversationStore.create({
        id: callSid,
        businessSlug: businessSlug,
        channel: "voice",
        language: "en",
        isAfterHours: afterHours,
      });
    }

    // Store user message
    await conversationStore.addMessage(callSid, {
      id: generateId(),
      role: "user",
      content: speechResult,
      language: session.language,
      timestamp: new Date(),
    });

    // Process with AI
    const response = await engine.processMessage(
      speechResult,
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
    await conversationStore.addMessage(callSid, {
      id: generateId(),
      role: "assistant",
      content: response.message,
      language: response.language,
      timestamp: new Date(),
    });

    // Update lead info
    if (response.leadUpdate) {
      await conversationStore.updateLead(callSid, response.leadUpdate);
    }

    // Check if should escalate — transfer to human
    if (response.shouldEscalate) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(response.message)}</Say>
  <Say voice="Polly.Joanna">Let me connect you with our team. One moment please.</Say>
  <Dial timeout="30" callerId="${process.env.TWILIO_PHONE_NUMBER ?? ""}">
    ${business.contact.phone}
  </Dial>
  <Say voice="Polly.Joanna">I'm sorry, our team is currently unavailable. Please try calling us directly at +371 23 444 401. Goodbye!</Say>
</Response>`;
      return new NextResponse(twiml, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    // Normal response — say and gather next input
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(response.message)}</Say>
  <Gather input="speech" action="/api/voice/process" method="POST" speechTimeout="auto" language="en-US" enhanced="true">
    <Pause length="1"/>
  </Gather>
  <Say voice="Polly.Joanna">Thank you for calling VIVIDERM. Have a great day! Goodbye.</Say>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    log.error({ err: error }, "Voice processing error");
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I'm sorry, I encountered an issue. Please call us directly at +371 23 444 401. Goodbye!</Say>
</Response>`;
    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
