import { describe, it, expect } from "vitest";
import {
  parseTwilioEvent,
  createMediaMessage,
  createMarkMessage,
  createClearMessage,
} from "../twilio/media-stream-protocol";

describe("Twilio Media Stream Protocol", () => {
  describe("parseTwilioEvent", () => {
    it("should parse connected event", () => {
      const raw = JSON.stringify({
        event: "connected",
        protocol: "Call",
        version: "1.0.0",
      });

      const event = parseTwilioEvent(raw);
      expect(event.event).toBe("connected");
    });

    it("should parse start event with all fields", () => {
      const raw = JSON.stringify({
        event: "start",
        sequenceNumber: "1",
        start: {
          streamSid: "MZ123",
          accountSid: "AC123",
          callSid: "CA123",
          tracks: ["inbound"],
          customParameters: { businessId: "vividerm", callerPhone: "+37120000000" },
          mediaFormat: {
            encoding: "audio/x-mulaw",
            sampleRate: 8000,
            channels: 1,
          },
        },
      });

      const event = parseTwilioEvent(raw);
      expect(event.event).toBe("start");
      if (event.event === "start") {
        expect(event.start.callSid).toBe("CA123");
        expect(event.start.streamSid).toBe("MZ123");
        expect(event.start.customParameters.businessId).toBe("vividerm");
        expect(event.start.mediaFormat.encoding).toBe("audio/x-mulaw");
        expect(event.start.mediaFormat.sampleRate).toBe(8000);
      }
    });

    it("should parse media event", () => {
      const raw = JSON.stringify({
        event: "media",
        sequenceNumber: "5",
        media: {
          track: "inbound",
          chunk: "1",
          timestamp: "100",
          payload: "dGVzdA==", // base64 "test"
        },
      });

      const event = parseTwilioEvent(raw);
      expect(event.event).toBe("media");
      if (event.event === "media") {
        expect(event.media.track).toBe("inbound");
        expect(event.media.payload).toBe("dGVzdA==");
      }
    });

    it("should parse stop event", () => {
      const raw = JSON.stringify({
        event: "stop",
        sequenceNumber: "99",
        stop: { accountSid: "AC123", callSid: "CA123" },
      });

      const event = parseTwilioEvent(raw);
      expect(event.event).toBe("stop");
    });

    it("should parse mark event", () => {
      const raw = JSON.stringify({
        event: "mark",
        sequenceNumber: "10",
        mark: { name: "response-end" },
      });

      const event = parseTwilioEvent(raw);
      expect(event.event).toBe("mark");
      if (event.event === "mark") {
        expect(event.mark.name).toBe("response-end");
      }
    });

    it("should throw on unknown event type", () => {
      const raw = JSON.stringify({ event: "unknown_event" });
      expect(() => parseTwilioEvent(raw)).toThrow("Unknown Twilio event");
    });

    it("should throw on invalid JSON", () => {
      expect(() => parseTwilioEvent("not json")).toThrow();
    });
  });

  describe("serializers", () => {
    it("createMediaMessage should produce valid JSON", () => {
      const msg = createMediaMessage("MZ123", "AQIDBA==");
      const parsed = JSON.parse(msg);

      expect(parsed.event).toBe("media");
      expect(parsed.streamSid).toBe("MZ123");
      expect(parsed.media.payload).toBe("AQIDBA==");
    });

    it("createMarkMessage should produce valid JSON", () => {
      const msg = createMarkMessage("MZ123", "end-of-response");
      const parsed = JSON.parse(msg);

      expect(parsed.event).toBe("mark");
      expect(parsed.streamSid).toBe("MZ123");
      expect(parsed.mark.name).toBe("end-of-response");
    });

    it("createClearMessage should produce valid JSON", () => {
      const msg = createClearMessage("MZ123");
      const parsed = JSON.parse(msg);

      expect(parsed.event).toBe("clear");
      expect(parsed.streamSid).toBe("MZ123");
    });
  });
});
