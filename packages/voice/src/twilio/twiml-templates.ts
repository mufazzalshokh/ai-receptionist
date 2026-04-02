// ============================================
// TwiML Response Templates
// ============================================

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * TwiML that connects the call to a WebSocket Media Stream.
 * Used as the primary voice handler when the streaming server is available.
 */
export function connectStreamTwiml(params: {
  wsUrl: string;
  businessId: string;
  callerPhone: string;
  callSid: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(params.wsUrl)}/ws/media-stream">
      <Parameter name="businessId" value="${escapeXml(params.businessId)}"/>
      <Parameter name="callerPhone" value="${escapeXml(params.callerPhone)}"/>
      <Parameter name="callSid" value="${escapeXml(params.callSid)}"/>
    </Stream>
  </Connect>
</Response>`;
}

/**
 * Fallback TwiML using Twilio's built-in Gather + Polly TTS.
 * Used when the streaming server is unavailable.
 */
export function fallbackGatherTwiml(params: {
  greeting: string;
  processUrl: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">${escapeXml(params.greeting)}</Say>
  <Gather input="speech" action="${escapeXml(params.processUrl)}" method="POST"
    speechTimeout="auto" language="en-US" enhanced="true">
    <Say voice="Polly.Joanna">I'm listening.</Say>
  </Gather>
  <Say voice="Polly.Joanna">I didn't catch that. Please call again.</Say>
</Response>`;
}
