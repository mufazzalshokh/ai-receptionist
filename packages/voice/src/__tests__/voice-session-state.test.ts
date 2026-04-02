import { describe, it, expect } from "vitest";
import { createInitialState, updateState } from "../session/voice-session-state";

describe("VoiceSessionState", () => {
  it("should create initial state with correct defaults", () => {
    const state = createInitialState({
      callSid: "CA123",
      streamSid: "MZ456",
      businessId: "vividerm",
      callerPhone: "+37120000000",
    });

    expect(state.callSid).toBe("CA123");
    expect(state.streamSid).toBe("MZ456");
    expect(state.businessId).toBe("vividerm");
    expect(state.callerPhone).toBe("+37120000000");
    expect(state.language).toBe("en");
    expect(state.phase).toBe("connecting");
    expect(state.messages).toEqual([]);
    expect(state.lead).toEqual({});
    expect(state.detectedIntents).toEqual([]);
    expect(state.isAfterHours).toBe(false);
    expect(state.createdAt).toBeInstanceOf(Date);
    expect(state.metrics.turnCount).toBe(0);
    expect(state.metrics.totalLatencyMs).toBe(0);
    expect(state.metrics.bargeInCount).toBe(0);
  });

  it("should produce a new object on update (immutable)", () => {
    const state = createInitialState({
      callSid: "CA123",
      streamSid: "MZ456",
      businessId: "vividerm",
      callerPhone: "+37120000000",
    });

    const updated = updateState(state, { phase: "listening", language: "lv" });

    // New object
    expect(updated).not.toBe(state);
    // Updated fields
    expect(updated.phase).toBe("listening");
    expect(updated.language).toBe("lv");
    // Preserved fields
    expect(updated.callSid).toBe("CA123");
    expect(updated.businessId).toBe("vividerm");
  });

  it("should not mutate the original state", () => {
    const state = createInitialState({
      callSid: "CA123",
      streamSid: "MZ456",
      businessId: "vividerm",
      callerPhone: "+37120000000",
    });

    updateState(state, { phase: "responding" });

    expect(state.phase).toBe("connecting"); // unchanged
  });
});
