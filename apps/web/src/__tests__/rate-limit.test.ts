import { describe, it, expect } from "vitest";
import { rateLimit, getClientIp } from "../lib/rate-limit";

describe("rateLimit", () => {
  // Each test uses a unique key to avoid cross-test interference
  let keyCounter = 0;
  function uniqueKey(): string {
    return `test-key-${++keyCounter}-${Date.now()}`;
  }

  it("should allow requests within the limit", () => {
    const key = uniqueKey();
    const result = rateLimit(key, 5, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("should decrement remaining count on each request", () => {
    const key = uniqueKey();
    rateLimit(key, 5, 60_000);
    rateLimit(key, 5, 60_000);
    const result = rateLimit(key, 5, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("should block requests beyond the limit", () => {
    const key = uniqueKey();
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 60_000);
    }
    const result = rateLimit(key, 3, 60_000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetMs).toBeGreaterThan(0);
  });

  it("should track different keys independently", () => {
    const keyA = uniqueKey();
    const keyB = uniqueKey();

    for (let i = 0; i < 3; i++) {
      rateLimit(keyA, 3, 60_000);
    }

    const resultA = rateLimit(keyA, 3, 60_000);
    const resultB = rateLimit(keyB, 3, 60_000);

    expect(resultA.success).toBe(false);
    expect(resultB.success).toBe(true);
  });

  it("should allow requests after window expires", async () => {
    const key = uniqueKey();
    const windowMs = 50; // 50ms window

    for (let i = 0; i < 2; i++) {
      rateLimit(key, 2, windowMs);
    }

    expect(rateLimit(key, 2, windowMs).success).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    const result = rateLimit(key, 2, windowMs);
    expect(result.success).toBe(true);
  });
});

describe("getClientIp", () => {
  it("should extract IP from x-forwarded-for header", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("should extract IP from x-real-ip header", () => {
    const headers = new Headers({ "x-real-ip": "10.0.0.1" });
    expect(getClientIp(headers)).toBe("10.0.0.1");
  });

  it("should prefer x-forwarded-for over x-real-ip", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "10.0.0.1",
    });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("should return 'unknown' when no headers present", () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe("unknown");
  });
});
