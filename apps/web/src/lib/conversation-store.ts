import type {
  ConversationMessage,
  SupportedLanguage,
  ConversationChannel,
  LeadData,
  DetectedIntent,
} from "@ai-receptionist/types";
import { prisma } from "@ai-receptionist/db";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("conversation-store");

/**
 * Hybrid conversation store: in-memory cache for active sessions,
 * with async Prisma DB persistence for durability.
 */

interface ConversationSession {
  readonly id: string;
  readonly businessId: string;
  readonly channel: ConversationChannel;
  readonly language: SupportedLanguage;
  readonly messages: ConversationMessage[];
  readonly lead: Partial<LeadData>;
  readonly detectedIntents: DetectedIntent[];
  readonly isAfterHours: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

class ConversationStore {
  private sessions = new Map<string, ConversationSession>();

  create(params: {
    id: string;
    businessId: string;
    channel: ConversationChannel;
    language: SupportedLanguage;
    isAfterHours: boolean;
  }): ConversationSession {
    const session: ConversationSession = {
      ...params,
      messages: [],
      lead: { source: params.channel, score: "cold", status: "new", interests: [], notes: "", qualificationAnswers: {} },
      detectedIntents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(params.id, session);

    // Persist to DB asynchronously
    void this.persistConversation(session).catch((err) => {
      log.debug({ err, sessionId: session.id }, "DB persist conversation failed (best-effort)");
    });

    return session;
  }

  get(id: string): ConversationSession | undefined {
    return this.sessions.get(id);
  }

  addMessage(sessionId: string, message: ConversationMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const updated: ConversationSession = {
      ...session,
      messages: [...session.messages, message],
      updatedAt: new Date(),
    };
    this.sessions.set(sessionId, updated);

    // Persist message to DB
    void this.persistMessage(sessionId, message).catch((err) => {
      log.debug({ err, sessionId }, "DB persist message failed (best-effort)");
    });
  }

  updateLead(sessionId: string, leadUpdate: Partial<LeadData>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const updated: ConversationSession = {
      ...session,
      lead: { ...session.lead, ...leadUpdate },
      updatedAt: new Date(),
    };
    this.sessions.set(sessionId, updated);

    // Persist lead to DB
    void this.persistLead(sessionId, updated.lead, updated.businessId).catch((err) => {
      log.debug({ err, sessionId }, "DB persist lead failed (best-effort)");
    });
  }

  updateLanguage(sessionId: string, language: SupportedLanguage): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const updated: ConversationSession = {
      ...session,
      language,
      updatedAt: new Date(),
    };
    this.sessions.set(sessionId, updated);

    void prisma.conversation.update({
      where: { id: sessionId },
      data: { language },
    }).catch((err) => {
      log.debug({ err, sessionId }, "DB update language failed (best-effort)");
    });
  }

  addIntent(sessionId: string, intent: DetectedIntent): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const updated: ConversationSession = {
      ...session,
      detectedIntents: [...session.detectedIntents, intent],
      updatedAt: new Date(),
    };
    this.sessions.set(sessionId, updated);
  }

  listByBusiness(businessId: string): ConversationSession[] {
    return Array.from(this.sessions.values())
      .filter((s) => s.businessId === businessId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const staleIds: string[] = [];
    for (const [id, session] of this.sessions) {
      if (session.updatedAt.getTime() < cutoff) {
        staleIds.push(id);
      }
    }
    for (const id of staleIds) {
      this.sessions.delete(id);
    }
  }

  // --- DB Persistence ---

  private async persistConversation(session: ConversationSession): Promise<void> {
    // Find business by slug (config uses slug as id)
    const business = await prisma.business.findUnique({
      where: { slug: session.businessId },
    });

    if (!business) return;

    await prisma.conversation.create({
      data: {
        id: session.id,
        businessId: business.id,
        channel: session.channel,
        language: session.language,
        status: "active",
      },
    });
  }

  private async persistMessage(conversationId: string, message: ConversationMessage): Promise<void> {
    await prisma.message.create({
      data: {
        conversationId,
        role: message.role,
        content: message.content,
        language: message.language,
        metadata: message.metadata ? JSON.parse(JSON.stringify(message.metadata)) : undefined,
      },
    });
  }

  private async persistLead(
    conversationId: string,
    lead: Partial<LeadData>,
    businessSlug: string
  ): Promise<void> {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
    });

    if (!business) return;

    // Only create/update lead if we have meaningful data
    if (!lead.name && !lead.phone && !lead.email) return;

    await prisma.lead.upsert({
      where: { conversationId },
      update: {
        name: lead.name ?? undefined,
        phone: lead.phone ?? undefined,
        email: lead.email ?? undefined,
        score: lead.score ?? "warm",
        status: lead.status ?? "new",
        interests: lead.interests ? [...lead.interests] : [],
        notes: lead.notes ?? undefined,
        qualificationData: lead.qualificationAnswers
          ? JSON.parse(JSON.stringify(lead.qualificationAnswers))
          : undefined,
      },
      create: {
        businessId: business.id,
        conversationId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: lead.source ?? "chat",
        score: lead.score ?? "warm",
        status: lead.status ?? "new",
        interests: lead.interests ? [...lead.interests] : [],
        notes: lead.notes ?? "",
      },
    });
  }
}

// Singleton — survives hot reloads in dev
const globalForStore = globalThis as unknown as {
  conversationStore: ConversationStore | undefined;
};

export const conversationStore =
  globalForStore.conversationStore ?? new ConversationStore();

if (process.env.NODE_ENV !== "production") {
  globalForStore.conversationStore = conversationStore;
}
