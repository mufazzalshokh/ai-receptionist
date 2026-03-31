import { NextRequest, NextResponse } from "next/server";
import { conversationStore } from "@/lib/conversation-store";

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId") ?? "vividerm";

  const conversations = conversationStore.listByBusiness(businessId);

  const summary = conversations.map((c) => ({
    id: c.id,
    channel: c.channel,
    language: c.language,
    status: c.messages.length > 0 ? "active" : "new",
    messageCount: c.messages.length,
    lead: c.lead,
    lastMessage: c.messages[c.messages.length - 1]?.content?.slice(0, 100) ?? "",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return NextResponse.json({
    success: true,
    data: summary,
    error: null,
    metadata: { total: summary.length },
  });
}
