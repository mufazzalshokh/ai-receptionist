import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ai-receptionist/db";

export async function GET(request: NextRequest) {
  const businessSlug = request.nextUrl.searchParams.get("businessId") ?? "vividerm";
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

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

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where: { businessId: business.id },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
        lead: {
          select: { name: true, phone: true, email: true, score: true, status: true },
        },
        _count: { select: { messages: true } },
      },
    }),
    prisma.conversation.count({ where: { businessId: business.id } }),
  ]);

  const summary = conversations.map((c) => ({
    id: c.id,
    channel: c.channel,
    language: c.language,
    status: c.status,
    messageCount: c._count.messages,
    lead: c.lead,
    lastMessage: c.messages[0]?.content?.slice(0, 100) ?? "",
    lastMessageRole: c.messages[0]?.role ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  return NextResponse.json({
    success: true,
    data: summary,
    error: null,
    meta: { total, page, limit },
  });
}
