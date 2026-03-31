import { NextRequest, NextResponse } from "next/server";
import { conversationStore } from "@/lib/conversation-store";

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId") ?? "vividerm";

  const conversations = conversationStore.listByBusiness(businessId);

  // Extract leads that have at least a name or phone
  const leads = conversations
    .filter((c) => c.lead.name || c.lead.phone || c.lead.email)
    .map((c) => ({
      conversationId: c.id,
      ...c.lead,
      channel: c.channel,
      language: c.language,
      messageCount: c.messages.length,
      lastActivity: c.updatedAt,
    }));

  return NextResponse.json({
    success: true,
    data: leads,
    error: null,
    metadata: { total: leads.length },
  });
}
