import { NextRequest, NextResponse } from "next/server";
import { vividermConfig } from "@ai-receptionist/config";
import type { WidgetConfig } from "@ai-receptionist/types";
import { isAfterHours } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId") ?? "vividerm";

  // MVP: only VividDerm
  const business = vividermConfig;
  const afterHours = isAfterHours(business.hours, business.timezone);

  const greeting = afterHours
    ? business.aiPersona.afterHoursGreeting.en
    : business.aiPersona.greeting.en;

  const config: WidgetConfig = {
    businessId,
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
