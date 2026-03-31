import type { BusinessConfig, EscalationReason, SupportedLanguage } from "@ai-receptionist/types";

interface EscalationPayload {
  businessId: string;
  conversationId: string;
  reason: EscalationReason;
  customerName?: string;
  customerPhone?: string;
  summary: string;
  language: SupportedLanguage;
  channel: string;
}

export async function triggerEscalation(
  payload: EscalationPayload,
  business: BusinessConfig
): Promise<{ success: boolean; method: string }> {
  const { escalation } = business;
  const contact = escalation.contacts.find((c) => c.onCall) ?? escalation.contacts[0];

  if (!contact) {
    console.error("[Escalation] No contacts configured for", business.id);
    return { success: false, method: "none" };
  }

  // Try SMS first (most reliable for urgent)
  if (escalation.methods.includes("sms") && contact.phone) {
    const sent = await sendSmsEscalation(contact.phone, payload);
    if (sent) return { success: true, method: "sms" };
  }

  // Try email
  if (escalation.methods.includes("email") && contact.email) {
    const sent = await sendEmailEscalation(contact.email, payload);
    if (sent) return { success: true, method: "email" };
  }

  // Webhook fallback
  if (escalation.methods.includes("webhook")) {
    const sent = await sendWebhookEscalation(payload);
    if (sent) return { success: true, method: "webhook" };
  }

  console.error("[Escalation] All methods failed for", business.id);
  return { success: false, method: "none" };
}

async function sendSmsEscalation(
  phone: string,
  payload: EscalationPayload
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("[Escalation] Twilio not configured, skipping SMS");
    return false;
  }

  try {
    const message = [
      `[AI Receptionist Alert]`,
      `Reason: ${payload.reason}`,
      `Customer: ${payload.customerName ?? "Unknown"}`,
      `Phone: ${payload.customerPhone ?? "Not provided"}`,
      `Summary: ${payload.summary}`,
      `Channel: ${payload.channel}`,
      `Conv ID: ${payload.conversationId}`,
    ].join("\n");

    const params = new URLSearchParams({
      To: phone,
      From: fromNumber,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("[Escalation] SMS failed:", error);
    return false;
  }
}

async function sendEmailEscalation(
  email: string,
  payload: EscalationPayload
): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    console.warn("[Escalation] Resend not configured, skipping email");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AI Receptionist <noreply@your-domain.com>",
        to: email,
        subject: `[Urgent] ${payload.reason} — ${payload.customerName ?? "Customer"}`,
        html: `
          <h2>Escalation Alert</h2>
          <p><strong>Reason:</strong> ${payload.reason}</p>
          <p><strong>Customer:</strong> ${payload.customerName ?? "Unknown"}</p>
          <p><strong>Phone:</strong> ${payload.customerPhone ?? "Not provided"}</p>
          <p><strong>Summary:</strong> ${payload.summary}</p>
          <p><strong>Channel:</strong> ${payload.channel}</p>
          <p><strong>Language:</strong> ${payload.language}</p>
        `,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("[Escalation] Email failed:", error);
    return false;
  }
}

async function sendWebhookEscalation(
  payload: EscalationPayload
): Promise<boolean> {
  // Generic webhook — can connect to Slack, Zapier, etc.
  console.log("[Escalation] Webhook payload:", JSON.stringify(payload));
  return true;
}
