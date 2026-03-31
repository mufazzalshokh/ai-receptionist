import { NextRequest, NextResponse } from "next/server";

/**
 * Twilio Voice Webhook — handles incoming calls.
 *
 * Flow:
 * 1. Twilio sends POST to this endpoint when a call comes in
 * 2. We respond with TwiML to greet and begin streaming
 * 3. Audio streams to Deepgram for STT
 * 4. Text goes to Claude for response
 * 5. Response text goes to ElevenLabs for TTS
 * 6. Audio streams back to Twilio
 *
 * For MVP: simple gather + say flow (no real-time streaming yet)
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const callerPhone = formData.get("From") as string ?? "unknown";
  const callSid = formData.get("CallSid") as string ?? "";

  console.log(`[Voice] Incoming call from ${callerPhone}, SID: ${callSid}`);

  // TwiML response: greet, then gather speech input
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
