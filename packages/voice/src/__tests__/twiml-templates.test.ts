import { describe, it, expect } from "vitest";
import { connectStreamTwiml, fallbackGatherTwiml } from "../twilio/twiml-templates";

describe("TwiML Templates", () => {
  describe("connectStreamTwiml", () => {
    it("should produce valid XML with Stream element", () => {
      const twiml = connectStreamTwiml({
        wsUrl: "wss://voice.fly.dev",
        businessId: "vividerm",
        callerPhone: "+37120000000",
        callSid: "CA123",
      });

      expect(twiml).toContain('<?xml version="1.0"');
      expect(twiml).toContain("<Response>");
      expect(twiml).toContain("<Connect>");
      expect(twiml).toContain("<Stream");
      expect(twiml).toContain('url="wss://voice.fly.dev/ws/media-stream"');
      expect(twiml).toContain('name="businessId" value="vividerm"');
      expect(twiml).toContain('name="callerPhone" value="+37120000000"');
      expect(twiml).toContain('name="callSid" value="CA123"');
    });

    it("should escape XML special characters", () => {
      const twiml = connectStreamTwiml({
        wsUrl: "wss://voice.fly.dev",
        businessId: "test&biz",
        callerPhone: "+371<>200",
        callSid: 'CA"123',
      });

      expect(twiml).toContain("test&amp;biz");
      expect(twiml).toContain("+371&lt;&gt;200");
      expect(twiml).toContain("CA&quot;123");
    });
  });

  describe("fallbackGatherTwiml", () => {
    it("should produce valid XML with Gather element", () => {
      const twiml = fallbackGatherTwiml({
        greeting: "Hello, welcome!",
        processUrl: "/api/voice/process",
      });

      expect(twiml).toContain("<Response>");
      expect(twiml).toContain("<Say");
      expect(twiml).toContain("Hello, welcome!");
      expect(twiml).toContain("<Gather");
      expect(twiml).toContain('action="/api/voice/process"');
      expect(twiml).toContain('input="speech"');
    });

    it("should escape special characters in greeting", () => {
      const twiml = fallbackGatherTwiml({
        greeting: "Price is <$50 & tax",
        processUrl: "/api/voice/process",
      });

      expect(twiml).toContain("Price is &lt;$50 &amp; tax");
    });
  });
});
