import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BusinessConfig } from "@ai-receptionist/types";

// Mock the logger to prevent pino initialization issues in tests
vi.mock("@/lib/logger", () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const makeTestBusiness = (
  overrides: Partial<BusinessConfig> = {}
): BusinessConfig => ({
  id: "test",
  name: "Test Business",
  industry: "aesthetics_clinic",
  timezone: "UTC",
  languages: ["en"],
  defaultLanguage: "en",
  contact: { phone: "", address: "", city: "", country: "" },
  hours: [],
  aiPersona: {
    name: "Test",
    tone: "professional_warm",
    greeting: { en: "Hello", lv: "Sveiki", ru: "Zdravstvujte" },
    afterHoursGreeting: { en: "Closed", lv: "Slēgts", ru: "Zakryto" },
    closingMessage: { en: "Bye", lv: "Ata", ru: "Poka" },
    neverDo: [],
    alwaysDo: [],
  },
  escalation: {
    methods: ["sms"],
    contacts: [],
    urgentKeywords: { en: [], lv: [], ru: [] },
  },
  ...overrides,
});

describe("escalation", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("should import triggerEscalation without errors", async () => {
    const mod = await import("../lib/escalation");
    expect(typeof mod.triggerEscalation).toBe("function");
  });

  it("should return failure when no contacts configured", async () => {
    const { triggerEscalation } = await import("../lib/escalation");

    const result = await triggerEscalation(
      {
        businessId: "test",
        conversationId: "conv-1",
        reason: "human_requested",
        summary: "test summary",
        language: "en",
        channel: "chat",
      },
      makeTestBusiness()
    );

    expect(result.success).toBe(false);
    expect(result.method).toBe("none");
  });

  it("should try SMS when contacts exist but Twilio is not configured", async () => {
    const { triggerEscalation } = await import("../lib/escalation");

    const business = makeTestBusiness({
      escalation: {
        methods: ["sms"],
        contacts: [{ name: "Admin", role: "manager", phone: "+371000", email: "a@b.com", onCall: true }],
        urgentKeywords: { en: [], lv: [], ru: [] },
      },
    });

    // No Twilio env vars set — SMS will fail, falls through
    const result = await triggerEscalation(
      {
        businessId: "test",
        conversationId: "conv-1",
        reason: "human_requested",
        summary: "test",
        language: "en",
        channel: "chat",
      },
      business
    );

    // SMS fails (no Twilio), no email or webhook configured either
    expect(result.success).toBe(false);
  });
});
