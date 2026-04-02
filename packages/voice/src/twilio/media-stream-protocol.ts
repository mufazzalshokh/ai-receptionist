// ============================================
// Twilio Media Stream WebSocket Protocol
// ============================================

// --- Inbound Events (Twilio -> Server) ---

export interface TwilioConnectedEvent {
  readonly event: "connected";
  readonly protocol: string;
  readonly version: string;
}

export interface TwilioStartEvent {
  readonly event: "start";
  readonly sequenceNumber: string;
  readonly start: {
    readonly streamSid: string;
    readonly accountSid: string;
    readonly callSid: string;
    readonly tracks: readonly string[];
    readonly customParameters: Record<string, string>;
    readonly mediaFormat: {
      readonly encoding: "audio/x-mulaw";
      readonly sampleRate: 8000;
      readonly channels: 1;
    };
  };
}

export interface TwilioMediaPayload {
  readonly event: "media";
  readonly sequenceNumber: string;
  readonly media: {
    readonly track: "inbound" | "outbound";
    readonly chunk: string;
    readonly timestamp: string;
    readonly payload: string; // base64-encoded mulaw audio
  };
}

export interface TwilioStopEvent {
  readonly event: "stop";
  readonly sequenceNumber: string;
  readonly stop: {
    readonly accountSid: string;
    readonly callSid: string;
  };
}

export interface TwilioMarkEvent {
  readonly event: "mark";
  readonly sequenceNumber: string;
  readonly mark: {
    readonly name: string;
  };
}

export type TwilioInboundEvent =
  | TwilioConnectedEvent
  | TwilioStartEvent
  | TwilioMediaPayload
  | TwilioStopEvent
  | TwilioMarkEvent;

// --- Outbound Messages (Server -> Twilio) ---

export interface TwilioOutboundMedia {
  readonly event: "media";
  readonly streamSid: string;
  readonly media: {
    readonly payload: string; // base64-encoded mulaw audio
  };
}

export interface TwilioOutboundMark {
  readonly event: "mark";
  readonly streamSid: string;
  readonly mark: {
    readonly name: string;
  };
}

export interface TwilioOutboundClear {
  readonly event: "clear";
  readonly streamSid: string;
}

export type TwilioOutboundMessage =
  | TwilioOutboundMedia
  | TwilioOutboundMark
  | TwilioOutboundClear;

// --- Parser ---

export function parseTwilioEvent(raw: string): TwilioInboundEvent {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON in Twilio event");
  }

  if (typeof data.event !== "string") {
    throw new Error("Missing or invalid 'event' field in Twilio message");
  }

  switch (data.event) {
    case "connected":
      return data as unknown as TwilioConnectedEvent;
    case "start":
      if (!data.start || typeof data.start !== "object") {
        throw new Error("Missing 'start' field in Twilio start event");
      }
      return data as unknown as TwilioStartEvent;
    case "media":
      if (!data.media || typeof data.media !== "object") {
        throw new Error("Missing 'media' field in Twilio media event");
      }
      return data as unknown as TwilioMediaPayload;
    case "stop":
      if (!data.stop || typeof data.stop !== "object") {
        throw new Error("Missing 'stop' field in Twilio stop event");
      }
      return data as unknown as TwilioStopEvent;
    case "mark":
      if (!data.mark || typeof data.mark !== "object") {
        throw new Error("Missing 'mark' field in Twilio mark event");
      }
      return data as unknown as TwilioMarkEvent;
    default:
      throw new Error(`Unknown Twilio event: ${data.event}`);
  }
}

// --- Serializers ---

export function createMediaMessage(
  streamSid: string,
  audioPayload: string
): string {
  return JSON.stringify({
    event: "media",
    streamSid,
    media: { payload: audioPayload },
  });
}

export function createMarkMessage(
  streamSid: string,
  name: string
): string {
  return JSON.stringify({
    event: "mark",
    streamSid,
    mark: { name },
  });
}

export function createClearMessage(streamSid: string): string {
  return JSON.stringify({
    event: "clear",
    streamSid,
  });
}
