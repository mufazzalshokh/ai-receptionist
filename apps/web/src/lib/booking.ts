import type { BookingRequest, BookingSlot } from "@ai-receptionist/types";
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
  request: BookingRequest
): Promise<{ success: boolean; bookingId?: string }> {
  const apiKey = process.env.ALTEG_API_KEY;
  const companyId = process.env.ALTEG_COMPANY_ID;

  if (!companyId) {
    log.info({ request }, "Booking request captured (no company ID, manual processing)");
    return { success: true, bookingId: `manual-${Date.now()}` };
  }

  if (!apiKey) {
    // Fallback: log the booking request for manual processing
    log.info({ request }, "Booking request captured (no API key, manual processing)");
    return {
      success: true,
      bookingId: `manual-${Date.now()}`,
    };
  }

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
    return {
      success: true,
      bookingId: data.data?.record_id?.toString(),
    };
  } catch (error) {
    log.error({ err: error }, "Failed to create booking");
    return { success: false };
  }
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
