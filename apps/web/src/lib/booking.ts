import type { BookingRequest, BookingSlot } from "@ai-receptionist/types";
import { prisma } from "@ai-receptionist/db";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("booking");

/**
 * Alteg Booking Integration
 *
 * Alteg (YCLIENTS) API for VividDerm's booking system.
 * Docs: https://docs.yclients.com/
 *
 * For MVP: booking request mode (capture info, notify staff).
 * Phase 2: direct calendar integration via Alteg API.
 */

const ALTEG_BASE_URL = "https://api.yclients.com/api/v1";

export async function getAvailableSlots(
  companyId: string,
  serviceId?: string,
  staffId?: string,
  date?: string
): Promise<BookingSlot[]> {
  const apiKey = process.env.ALTEG_API_KEY;

  if (!apiKey) {
    log.warn("Alteg API not configured");
    return [];
  }

  try {
    const params = new URLSearchParams();
    if (serviceId) params.set("service_id", serviceId);
    if (staffId) params.set("staff_id", staffId);
    if (date) params.set("date", date);

    const response = await fetch(
      `${ALTEG_BASE_URL}/book_dates/${companyId}?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/vnd.yclients.v2+json",
        },
      }
    );

    if (!response.ok) {
      log.error({ status: response.status }, "Alteg API error fetching slots");
      return [];
    }

    const data = await response.json();

    // Transform Alteg format to our BookingSlot
    return (data.data?.booking_dates ?? []).map(
      (slot: { datetime: string; duration: number; staff_name?: string }) => ({
        datetime: new Date(slot.datetime),
        duration: slot.duration ?? 60,
        specialist: slot.staff_name,
        available: true,
      })
    );
  } catch (error) {
    log.error({ err: error }, "Failed to fetch booking slots");
    return [];
  }
}

export async function createBookingRequest(
  request: BookingRequest,
  businessSlug: string = "vividerm"
): Promise<{ success: boolean; bookingId?: string }> {
  const apiKey = process.env.ALTEG_API_KEY;
  const companyId = process.env.ALTEG_COMPANY_ID;

  let externalId: string | undefined;
  let status = "pending";

  if (!apiKey || !companyId) {
    log.info({ request }, "Booking request captured (manual processing)");
    externalId = `manual-${Date.now()}`;
  } else {
    try {
      const response = await fetch(
        `${ALTEG_BASE_URL}/book_record/${companyId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.yclients.v2+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: request.customerPhone,
            fullname: request.customerName,
            email: request.customerEmail ?? "",
            comment: `AI Receptionist booking. Service: ${request.service}. ${request.notes ?? ""}`,
            notify_by_sms: 1,
            notify_by_email: request.customerEmail ? 1 : 0,
          }),
        }
      );

      if (!response.ok) {
        log.error({ status: response.status }, "Alteg API error creating booking");
        return { success: false };
      }

      const data = await response.json();
      externalId = data.data?.record_id?.toString();
      status = "confirmed";
    } catch (error) {
      log.error({ err: error }, "Failed to create booking via Alteg");
      return { success: false };
    }
  }

  // Persist booking to local DB
  const bookingId = await persistBooking(request, businessSlug, externalId, status);

  return { success: true, bookingId: bookingId ?? externalId };
}

async function persistBooking(
  request: BookingRequest,
  businessSlug: string,
  externalId: string | undefined,
  status: string
): Promise<string | null> {
  try {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      select: { id: true },
    });
    if (!business) return null;

    // Link to lead if conversation exists
    const lead = request.conversationId
      ? await prisma.lead.findUnique({
          where: { conversationId: request.conversationId },
          select: { id: true },
        })
      : null;

    const booking = await prisma.booking.create({
      data: {
        businessId: business.id,
        leadId: lead?.id ?? null,
        service: request.service,
        specialist: request.specialist ?? null,
        scheduledAt: parseScheduledAt(request.preferredDate, request.preferredTime),
        duration: 60,
        status,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        customerEmail: request.customerEmail ?? null,
        notes: request.notes ?? null,
        externalId: externalId ?? null,
      },
    });

    log.info({ bookingId: booking.id, externalId }, "Booking persisted to DB");
    return booking.id;
  } catch (err) {
    log.error({ err }, "Failed to persist booking to DB");
    return null;
  }
}

function parseScheduledAt(date?: string, time?: string): Date {
  if (date && time) {
    const parsed = new Date(`${date}T${time}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (date) {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  // Default: next business day 10:00 as placeholder for staff to confirm
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  return next;
}

/**
 * Notify staff about a new booking request.
 * Used in "request" booking mode.
 */
export async function notifyStaffOfBooking(
  request: BookingRequest,
  staffPhone: string
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    log.info({ request }, "Staff booking notification (no Twilio, logged for manual processing)");
    return true;
  }

  try {
    const message = [
      `[New Booking Request]`,
      `Customer: ${request.customerName}`,
      `Phone: ${request.customerPhone}`,
      `Service: ${request.service}`,
      `Preferred: ${request.preferredDate ?? "Flexible"} ${request.preferredTime ?? ""}`,
      `Notes: ${request.notes ?? "None"}`,
    ].join("\n");

    const params = new URLSearchParams({
      To: staffPhone,
      From: fromNumber,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    return response.ok;
  } catch (error) {
    log.error({ err: error }, "Staff booking notification failed");
    return false;
  }
}
