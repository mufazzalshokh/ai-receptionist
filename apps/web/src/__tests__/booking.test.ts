import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockFetch } = vi.hoisted(() => {
  const mockPrisma = {
    business: { findUnique: vi.fn() },
    lead: { findUnique: vi.fn() },
    booking: { create: vi.fn() },
  };
  const mockFetch = vi.fn();
  return { mockPrisma, mockFetch };
});

vi.mock("@/lib/logger", () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("@ai-receptionist/db", () => ({ prisma: mockPrisma }));

vi.stubGlobal("fetch", mockFetch);

import { createBookingRequest, getAvailableSlots } from "../lib/booking";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createBookingRequest", () => {
  const baseRequest = {
    conversationId: "conv-123",
    customerName: "Anna",
    customerPhone: "+37120000001",
    service: "Laser Hair Removal",
    notes: "Test booking",
  };

  it("persists booking to DB in manual mode when no API key", async () => {
    delete process.env.ALTEG_API_KEY;
    delete process.env.ALTEG_COMPANY_ID;

    mockPrisma.business.findUnique.mockResolvedValue({ id: "biz-1" });
    mockPrisma.lead.findUnique.mockResolvedValue({ id: "lead-1" });
    mockPrisma.booking.create.mockResolvedValue({ id: "booking-1" });

    const result = await createBookingRequest(baseRequest, "vividerm");

    expect(result.success).toBe(true);
    expect(result.bookingId).toBe("booking-1");
    expect(mockPrisma.booking.create).toHaveBeenCalledOnce();
    expect(mockPrisma.booking.create.mock.calls[0][0].data).toMatchObject({
      businessId: "biz-1",
      leadId: "lead-1",
      service: "Laser Hair Removal",
      customerName: "Anna",
      customerPhone: "+37120000001",
      status: "pending",
    });
  });

  it("calls Alteg API and persists with confirmed status when API key is set", async () => {
    process.env.ALTEG_API_KEY = "test-key";
    process.env.ALTEG_COMPANY_ID = "757934";

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { record_id: "alteg-99" } }),
    });
    mockPrisma.business.findUnique.mockResolvedValue({ id: "biz-1" });
    mockPrisma.lead.findUnique.mockResolvedValue(null);
    mockPrisma.booking.create.mockResolvedValue({ id: "booking-2" });

    const result = await createBookingRequest(baseRequest, "vividerm");

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][0]).toContain("/book_record/757934");
    expect(mockPrisma.booking.create.mock.calls[0][0].data).toMatchObject({
      status: "confirmed",
      externalId: "alteg-99",
      leadId: null,
    });

    delete process.env.ALTEG_API_KEY;
    delete process.env.ALTEG_COMPANY_ID;
  });

  it("returns failure when Alteg API returns error", async () => {
    process.env.ALTEG_API_KEY = "test-key";
    process.env.ALTEG_COMPANY_ID = "757934";

    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await createBookingRequest(baseRequest, "vividerm");

    expect(result.success).toBe(false);
    expect(mockPrisma.booking.create).not.toHaveBeenCalled();

    delete process.env.ALTEG_API_KEY;
    delete process.env.ALTEG_COMPANY_ID;
  });

  it("still succeeds if DB persistence fails (best-effort)", async () => {
    delete process.env.ALTEG_API_KEY;
    delete process.env.ALTEG_COMPANY_ID;

    mockPrisma.business.findUnique.mockRejectedValue(new Error("DB down"));

    const result = await createBookingRequest(baseRequest, "vividerm");

    expect(result.success).toBe(true);
    expect(result.bookingId).toContain("manual-");
  });
});

describe("getAvailableSlots", () => {
  it("returns empty array when API key not set", async () => {
    delete process.env.ALTEG_API_KEY;
    const slots = await getAvailableSlots("757934");
    expect(slots).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches and transforms slots from Alteg API", async () => {
    process.env.ALTEG_API_KEY = "test-key";

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            booking_dates: [
              { datetime: "2026-04-10T10:00:00", duration: 45, staff_name: "Dr. A" },
              { datetime: "2026-04-10T11:00:00", duration: 60 },
            ],
          },
        }),
    });

    const slots = await getAvailableSlots("757934", "svc-1", undefined, "2026-04-10");

    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({
      duration: 45,
      specialist: "Dr. A",
      available: true,
    });
    expect(slots[0].datetime).toBeInstanceOf(Date);
    expect(slots[1].specialist).toBeUndefined();

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("service_id=svc-1");
    expect(url).toContain("date=2026-04-10");

    delete process.env.ALTEG_API_KEY;
  });

  it("returns empty array on API error", async () => {
    process.env.ALTEG_API_KEY = "test-key";
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    const slots = await getAvailableSlots("757934");
    expect(slots).toEqual([]);

    delete process.env.ALTEG_API_KEY;
  });
});
