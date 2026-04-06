import { NextRequest, NextResponse } from "next/server";
import { getBusinessConfig } from "@ai-receptionist/config";
import type { WidgetConfig, BusinessConfig } from "@ai-receptionist/types";
import { isAfterHours } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId") ?? "vividerm";

  let business: BusinessConfig;
  try {
    business = getBusinessConfig(businessId);
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Unknown business" },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
  const afterHours = isAfterHours(business.hours, business.timezone);

  const greeting = afterHours
    ? business.aiPersona.afterHoursGreeting.en
    : business.aiPersona.greeting.en;

  const config: WidgetConfig = {
    businessId,
    businessName: business.name,
    position: "bottom-right",
    primaryColor: "#6366f1",
    accentColor: "#4f46e5",
    greeting,
    placeholder: "Type your message...",
    showBranding: true,
    language: business.defaultLanguage,
    availableLanguages: [...business.languages],
  };

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  return NextResponse.json(
    { success: true, data: config, error: null },
    { headers }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
