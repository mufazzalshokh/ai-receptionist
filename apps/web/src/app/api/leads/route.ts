import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ai-receptionist/db";
import { getSessionBusiness } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSessionBusiness();
  if (!session) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

  const business = await prisma.business.findUnique({
    where: { slug: session.businessSlug },
    select: { id: true },
  });

  if (!business) {
    return NextResponse.json(
      { success: false, data: null, error: "Business not found" },
      { status: 404 }
    );
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: { businessId: business.id },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        conversation: {
          select: {
            channel: true,
            language: true,
            _count: { select: { messages: true } },
          },
        },
      },
    }),
    prisma.lead.count({ where: { businessId: business.id } }),
  ]);

  const data = leads.map((lead) => ({
    id: lead.id,
    conversationId: lead.conversationId,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    score: lead.score,
    status: lead.status,
    interests: lead.interests,
    notes: lead.notes,
    channel: lead.conversation?.channel ?? null,
    language: lead.conversation?.language ?? null,
    messageCount: lead.conversation?._count.messages ?? 0,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  }));

  return NextResponse.json({
    success: true,
    data,
    error: null,
    meta: { total, page, limit },
  });
}
