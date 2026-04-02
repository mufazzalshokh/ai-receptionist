import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Twilio Voice Webhook — handles incoming calls.
 *
 * Primary: connects to WebSocket streaming server (Fly.io) for
 * real-time STT (Deepgram) + AI (Claude streaming) + TTS (ElevenLabs).
 *
 * Fallback: if streaming server is unreachable, falls back to
 * TwiML Gather + Polly TTS batch mode.
 */
export async function POST(request: NextRequest) {
  // Validate Twilio signature to prevent forged webhook calls
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const signature = request.headers.get("x-twilio-signature") ?? "";
    const url = `${process.env.NEXT_PUBLIC_APP_URL ?? request.url.split("?")[0]}`;
    const formDataForValidation = await request.clone().formData();
    const isValid = validateTwilioSignature(authToken, signature, url, formDataForValidation);
    if (!isValid) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const formData = await request.formData();
  const callerPhone = (formData.get("From") as string) ?? "unknown";
  const callSid = (formData.get("CallSid") as string) ?? "";

  const voiceServerUrl = process.env.VOICE_SERVER_URL;
  const wsSecret = process.env.VOICE_WS_SECRET;

  // Primary: WebSocket streaming via Fly.io voice server
  if (voiceServerUrl) {
    const isHealthy = await checkVoiceServerHealth(voiceServerUrl);

    if (isHealthy) {
      const tokenParam = wsSecret ? `?token=${encodeURIComponent(wsSecret)}` : "";
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(voiceServerUrl)}/ws/media-stream${tokenParam}">
      <Parameter name="businessId" value="vividerm"/>
      <Parameter name="callerPhone" value="${escapeXml(callerPhone)}"/>
      <Parameter name="callSid" value="${escapeXml(callSid)}"/>
    </Stream>
  </Connect>
</Response>`;

      return new NextResponse(twiml, {
        headers: { "Content-Type": "application/xml" },
      });
    }
  }

  // Fallback: TwiML batch mode (Twilio ASR + Polly TTS)
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">
    Hello! Welcome to VIVIDERM Laser Dermatology Clinic.
    I'm your virtual assistant. How can I help you today?
  </Say>
  <Gather
    input="speech"
    action="/api/voice/process"
    method="POST"
    speechTimeout="auto"
    language="en-US"
    enhanced="true"
  >
    <Say voice="Polly.Joanna">I'm listening.</Say>
  </Gather>
  <Say voice="Polly.Joanna">
    I didn't catch that. Please call us during business hours at +371 23 444 401.
    Goodbye!
  </Say>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "application/xml" },
  });
}

function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  formData: FormData
): boolean {
  // Build the data string: URL + sorted key-value pairs from POST body
  const params: [string, string][] = [];
  formData.forEach((value, key) => {
    params.push([key, String(value)]);
  });
  params.sort((a, b) => a[0].localeCompare(b[0]));

  let dataString = url;
  for (const [key, value] of params) {
    dataString += key + value;
  }

  const computed = createHmac("sha1", authToken)
    .update(dataString)
    .digest("base64");

  // Timing-safe comparison
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(computed);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
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

async function checkVoiceServerHealth(baseUrl: string): Promise<boolean> {
  try {
    const url = new URL("/health", baseUrl);
    url.protocol = url.protocol === "wss:" ? "https:" : "http:";
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
