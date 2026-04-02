import { describe, it, expect, vi, beforeEach } from "vitest";
import { BargeInDetector } from "../barge-in/barge-in-detector";

describe("BargeInDetector", () => {
  let detector: BargeInDetector;
  let handler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    detector = new BargeInDetector({
      enabled: true,
      minInterruptionDurationMs: 150,
    });
    handler = vi.fn();
    detector.onBargeIn(handler);
  });

  it("should not trigger when not monitoring", () => {
    detector.onInterimTranscript("hello");
    expect(handler).not.toHaveBeenCalled();
  });

  it("should not trigger on first interim (needs duration check)", () => {
    detector.startMonitoring();
    const triggered = detector.onInterimTranscript("hello");
    expect(triggered).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("should trigger after minInterruptionDurationMs", () => {
    detector.startMonitoring();

    // First interim — sets the timestamp
    detector.onInterimTranscript("hel");

    // Simulate time passing beyond threshold
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 200);

    const triggered = detector.onInterimTranscript("hello");
    expect(triggered).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("should NOT trigger if speech is too short", () => {
    detector.startMonitoring();

    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    detector.onInterimTranscript("h");

    // Only 50ms later — below 150ms threshold
    vi.spyOn(Date, "now").mockReturnValue(now + 50);
    const triggered = detector.onInterimTranscript("he");
    expect(triggered).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("should reset when empty transcript received", () => {
    detector.startMonitoring();

    detector.onInterimTranscript("hello");
    detector.onInterimTranscript(""); // reset
    detector.onInterimTranscript("  "); // whitespace also resets

    // Even after long time, no trigger because timer was reset
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 500);
    // This is a NEW first detection, so it won't trigger yet
    const triggered = detector.onInterimTranscript("hey");
    expect(triggered).toBe(false);
  });

  it("should stop monitoring after barge-in triggers", () => {
    detector.startMonitoring();
    expect(detector.monitoring).toBe(true);

    detector.onInterimTranscript("hello");
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 200);
    detector.onInterimTranscript("hello world");

    expect(detector.monitoring).toBe(false);
  });

  it("should do nothing when disabled", () => {
    const disabled = new BargeInDetector({
      enabled: false,
      minInterruptionDurationMs: 150,
    });
    disabled.onBargeIn(handler);
    disabled.startMonitoring();

    expect(disabled.monitoring).toBe(false);

    disabled.onInterimTranscript("hello");
    expect(handler).not.toHaveBeenCalled();
  });

  it("stopMonitoring should prevent triggers", () => {
    detector.startMonitoring();
    detector.onInterimTranscript("hello");
    detector.stopMonitoring();

    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 500);
    detector.onInterimTranscript("hello world");
    expect(handler).not.toHaveBeenCalled();
  });
});
