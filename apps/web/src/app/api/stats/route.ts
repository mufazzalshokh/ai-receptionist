import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ai-receptionist/db";

export async function GET(request: NextRequest) {
  const businessSlug = request.nextUrl.searchParams.get("businessId") ?? "vividerm";

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true },
  });

  if (!business) {
    return NextResponse.json(
      { success: false, data: null, error: "Business not found" },
      { status: 404 }
    );
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    totalConversations,
    todayConversations,
    weekConversations,
    totalLeads,
    hotLeads,
    warmLeads,
    totalMessages,
    escalations,
    channelBreakdown,
    languageBreakdown,
  ] = await Promise.all([
    prisma.conversation.count({ where: { businessId: business.id } }),
    prisma.conversation.count({
      where: { businessId: business.id, createdAt: { gte: todayStart } },
    }),
    prisma.conversation.count({
      where: { businessId: business.id, createdAt: { gte: weekStart } },
    }),
    prisma.lead.count({ where: { businessId: business.id } }),
    prisma.lead.count({ where: { businessId: business.id, score: "hot" } }),
    prisma.lead.count({ where: { businessId: business.id, score: "warm" } }),
    prisma.message.count({
      where: { conversation: { businessId: business.id } },
    }),
    prisma.escalation.count({ where: { businessId: business.id } }),
    prisma.conversation.groupBy({
      by: ["channel"],
      where: { businessId: business.id },
      _count: true,
    }),
    prisma.conversation.groupBy({
      by: ["language"],
      where: { businessId: business.id },
      _count: true,
    }),
  ]);

  const avgMessagesPerConversation =
    totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0;

  return NextResponse.json({
    success: true,
    data: {
      conversations: {
        total: totalConversations,
        today: todayConversations,
        thisWeek: weekConversations,
      },
      leads: {
        total: totalLeads,
        hot: hotLeads,
        warm: warmLeads,
      },
      messages: {
        total: totalMessages,
        avgPerConversation: avgMessagesPerConversation,
      },
      escalations,
      channels: Object.fromEntries(
        channelBreakdown.map((c) => [c.channel, c._count])
      ),
      languages: Object.fromEntries(
        languageBreakdown.map((l) => [l.language, l._count])
      ),
    },
    error: null,
  });
}
