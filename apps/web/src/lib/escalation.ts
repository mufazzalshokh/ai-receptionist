import type { BusinessConfig, EscalationReason, SupportedLanguage } from "@ai-receptionist/types";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("escalation");

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
    log.error({ businessId: business.id }, "No contacts configured");
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

  log.error({ businessId: business.id }, "All escalation methods failed");
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
    log.warn("Twilio not configured, skipping SMS");
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
    log.error({ err: error }, "SMS escalation failed");
    return false;
  }
}

async function sendEmailEscalation(
  email: string,
  payload: EscalationPayload
): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    log.warn("Resend not configured, skipping email");
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
        from: `AI Receptionist <${process.env.ESCALATION_FROM_EMAIL ?? "noreply@your-domain.com"}>`,
        to: email,
        subject: `[Urgent] ${escapeHtml(payload.reason)} — ${escapeHtml(payload.customerName ?? "Customer")}`,
        html: `
          <h2>Escalation Alert</h2>
          <p><strong>Reason:</strong> ${escapeHtml(payload.reason)}</p>
          <p><strong>Customer:</strong> ${escapeHtml(payload.customerName ?? "Unknown")}</p>
          <p><strong>Phone:</strong> ${escapeHtml(payload.customerPhone ?? "Not provided")}</p>
          <p><strong>Summary:</strong> ${escapeHtml(payload.summary)}</p>
          <p><strong>Channel:</strong> ${escapeHtml(payload.channel)}</p>
          <p><strong>Language:</strong> ${escapeHtml(payload.language)}</p>
        `,
      }),
    });

    return response.ok;
  } catch (error) {
    log.error({ err: error }, "Email escalation failed");
    return false;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendWebhookEscalation(
  payload: EscalationPayload
): Promise<boolean> {
  const webhookUrl = process.env.ESCALATION_WEBHOOK_URL;

  if (!webhookUrl) {
    log.warn("No ESCALATION_WEBHOOK_URL configured, skipping webhook");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "escalation",
        ...payload,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      log.error({ status: response.status, url: webhookUrl }, "Webhook returned error");
      return false;
    }

    log.info({ url: webhookUrl }, "Webhook escalation sent");
    return true;
  } catch (error) {
    log.error({ err: error }, "Webhook escalation failed");
    return false;
  }
}
