import { describe, it, expect } from "vitest";
import { generateId, isAfterHours } from "../lib/utils";

describe("generateId", () => {
  it("should return a string", () => {
    expect(typeof generateId()).toBe("string");
  });

  it("should generate unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("should return UUID format", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});

describe("isAfterHours", () => {
  const allOpenHours = [
    { day: "monday", open: "00:00", close: "23:59", isOpen: true },
    { day: "tuesday", open: "00:00", close: "23:59", isOpen: true },
    { day: "wednesday", open: "00:00", close: "23:59", isOpen: true },
    { day: "thursday", open: "00:00", close: "23:59", isOpen: true },
    { day: "friday", open: "00:00", close: "23:59", isOpen: true },
    { day: "saturday", open: "00:00", close: "23:59", isOpen: true },
    { day: "sunday", open: "00:00", close: "23:59", isOpen: true },
  ] as const;

  const allClosedHours = [
    { day: "monday", open: "00:00", close: "00:00", isOpen: false },
    { day: "tuesday", open: "00:00", close: "00:00", isOpen: false },
    { day: "wednesday", open: "00:00", close: "00:00", isOpen: false },
    { day: "thursday", open: "00:00", close: "00:00", isOpen: false },
    { day: "friday", open: "00:00", close: "00:00", isOpen: false },
    { day: "saturday", open: "00:00", close: "00:00", isOpen: false },
    { day: "sunday", open: "00:00", close: "00:00", isOpen: false },
  ] as const;

  it("should return false when open 24/7", () => {
    expect(isAfterHours(allOpenHours, "Europe/Riga")).toBe(false);
  });

  it("should return true when all days are closed", () => {
    expect(isAfterHours(allClosedHours, "Europe/Riga")).toBe(true);
  });

  it("should return a boolean for normal hours", () => {
    const hours = [
      { day: "monday", open: "09:00", close: "18:00", isOpen: true },
      { day: "tuesday", open: "09:00", close: "18:00", isOpen: true },
      { day: "wednesday", open: "09:00", close: "18:00", isOpen: true },
      { day: "thursday", open: "09:00", close: "18:00", isOpen: true },
      { day: "friday", open: "09:00", close: "18:00", isOpen: true },
      { day: "saturday", open: "10:00", close: "15:00", isOpen: true },
      { day: "sunday", open: "00:00", close: "00:00", isOpen: false },
    ] as const;

    expect(typeof isAfterHours(hours, "Europe/Riga")).toBe("boolean");
  });
});
