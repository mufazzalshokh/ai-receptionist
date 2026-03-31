import type { BookingRequest, BookingSlot } from "@ai-receptionist/types";

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
    console.warn("[Booking] Alteg API not configured");
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
      console.error("[Booking] Alteg API error:", response.status);
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
    console.error("[Booking] Failed to fetch slots:", error);
    return [];
  }
}

export async function createBookingRequest(
  request: BookingRequest
): Promise<{ success: boolean; bookingId?: string }> {
  const apiKey = process.env.ALTEG_API_KEY;
  const companyId = process.env.ALTEG_COMPANY_ID ?? "757934";

  if (!apiKey) {
    // Fallback: log the booking request for manual processing
    console.log("[Booking] Request (no API key):", JSON.stringify(request));
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
      console.error("[Booking] Alteg create error:", response.status);
      return { success: false };
    }

    const data = await response.json();
    return {
      success: true,
      bookingId: data.data?.record_id?.toString(),
    };
  } catch (error) {
    console.error("[Booking] Failed to create booking:", error);
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
    console.log("[Booking] Staff notification (no Twilio):", JSON.stringify(request));
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
    console.error("[Booking] Staff notification failed:", error);
    return false;
  }
}
