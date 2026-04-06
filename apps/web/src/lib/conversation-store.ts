import type {
  ConversationMessage,
  SupportedLanguage,
  ConversationChannel,
  LeadData,
  LeadStatus,
  DetectedIntent,
} from "@ai-receptionist/types";
import { prisma } from "@ai-receptionist/db";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("conversation-store");

/**
 * Conversation store: DB is the source of truth, in-memory Map is a hot cache.
 * All write operations are synchronous (awaited) to guarantee durability.
 */

export interface ConversationSession {
  readonly id: string;
  readonly businessSlug: string;
  readonly dbBusinessId: string;
  readonly channel: ConversationChannel;
  language: SupportedLanguage;
  readonly messages: ConversationMessage[];
  lead: Partial<LeadData>;
  detectedIntents: DetectedIntent[];
  readonly isAfterHours: boolean;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface ConversationMetadata {
  businessSlug?: string;
  detectedIntents?: DetectedIntent[];
}

class ConversationStore {
  private sessions = new Map<string, ConversationSession>();

  /**
   * Create a new conversation. Persists synchronously to DB.
   */
  async create(params: {
    id: string;
    businessSlug: string;
    channel: ConversationChannel;
    language: SupportedLanguage;
    isAfterHours: boolean;
  }): Promise<ConversationSession> {
    // Look up the DB business ID from slug
    const business = await prisma.business.findUnique({
      where: { slug: params.businessSlug },
      select: { id: true },
    });

    if (!business) {
      throw new Error(`Business not found: ${params.businessSlug}`);
    }

    await prisma.conversation.create({
      data: {
        id: params.id,
        businessId: business.id,
        channel: params.channel,
        language: params.language,
        status: "active",
        metadata: JSON.parse(JSON.stringify({ businessSlug: params.businessSlug, detectedIntents: [] })),
      },
    });

    const session: ConversationSession = {
      id: params.id,
      businessSlug: params.businessSlug,
      dbBusinessId: business.id,
      channel: params.channel,
      language: params.language,
      messages: [],
      lead: { source: params.channel, score: "cold", status: "new", interests: [], notes: "", qualificationAnswers: {} },
      detectedIntents: [],
      isAfterHours: params.isAfterHours,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(params.id, session);
    return session;
  }

  /**
   * Get from cache, or load from DB on cache miss.
   * Returns undefined if conversation does not exist anywhere.
   */
  async getOrLoad(id: string, isAfterHours: boolean): Promise<ConversationSession | undefined> {
    // Check in-memory cache first
    const cached = this.sessions.get(id);
    if (cached) return cached;

    // Load from DB
    try {
      const row = await prisma.conversation.findUnique({
        where: { id },
        include: {
          business: { select: { id: true, slug: true } },
          messages: { orderBy: { createdAt: "asc" } },
          lead: true,
        },
      });

      if (!row) return undefined;

      const metadata = (row.metadata ?? {}) as ConversationMetadata;

      const messages: ConversationMessage[] = row.messages.map((m) => ({
        id: m.id,
        role: m.role as ConversationMessage["role"],
        content: m.content,
        language: m.language as SupportedLanguage,
        timestamp: m.createdAt,
        metadata: m.metadata as Record<string, unknown> | undefined,
      }));

      const lead: Partial<LeadData> = row.lead
        ? {
            name: row.lead.name ?? undefined,
            phone: row.lead.phone ?? undefined,
            email: row.lead.email ?? undefined,
            source: row.lead.source as ConversationChannel,
            score: row.lead.score as LeadData["score"],
            status: row.lead.status as LeadStatus,
            interests: row.lead.interests ?? [],
            notes: row.lead.notes ?? "",
            qualificationAnswers: (row.lead.qualificationData as Record<string, string>) ?? {},
          }
        : { source: row.channel as ConversationChannel, score: "cold", status: "new", interests: [], notes: "", qualificationAnswers: {} };

      const session: ConversationSession = {
        id: row.id,
        businessSlug: metadata.businessSlug ?? row.business.slug,
        dbBusinessId: row.business.id,
        channel: row.channel as ConversationChannel,
        language: row.language as SupportedLanguage,
        messages,
        lead,
        detectedIntents: metadata.detectedIntents ?? [],
        isAfterHours,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };

      this.sessions.set(id, session);
      return session;
    } catch (err) {
      log.error({ err, id }, "Failed to load conversation from DB");
      return undefined;
    }
  }

  /**
   * Add a message. Persists synchronously to DB.
   */
  async addMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    await prisma.message.create({
      data: {
        conversationId: sessionId,
        role: message.role,
        content: message.content,
        language: message.language,
        metadata: message.metadata ? JSON.parse(JSON.stringify(message.metadata)) : undefined,
      },
    });

    session.messages.push(message);
    session.updatedAt = new Date();
  }

  /**
   * Upsert lead data. Persists synchronously to DB.
   */
  async updateLead(sessionId: string, leadUpdate: Partial<LeadData>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.lead = { ...session.lead, ...leadUpdate };
    session.updatedAt = new Date();

    // Only persist if we have meaningful contact data
    if (!session.lead.name && !session.lead.phone && !session.lead.email) return;

    await prisma.lead.upsert({
      where: { conversationId: sessionId },
      update: {
        name: session.lead.name ?? undefined,
        phone: session.lead.phone ?? undefined,
        email: session.lead.email ?? undefined,
        score: session.lead.score ?? "warm",
        status: session.lead.status ?? "new",
        interests: session.lead.interests ? [...session.lead.interests] : [],
        notes: session.lead.notes ?? undefined,
        qualificationData: session.lead.qualificationAnswers
          ? JSON.parse(JSON.stringify(session.lead.qualificationAnswers))
          : undefined,
      },
      create: {
        businessId: session.dbBusinessId,
        conversationId: sessionId,
        name: session.lead.name,
        phone: session.lead.phone,
        email: session.lead.email,
        source: session.lead.source ?? "chat",
        score: session.lead.score ?? "warm",
        status: session.lead.status ?? "new",
        interests: session.lead.interests ? [...session.lead.interests] : [],
        notes: session.lead.notes ?? "",
      },
    });
  }

  /**
   * Update conversation language. Persists synchronously to DB.
   */
  async updateLanguage(sessionId: string, language: SupportedLanguage): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.language = language;
    session.updatedAt = new Date();

    await prisma.conversation.update({
      where: { id: sessionId },
      data: { language },
    });
  }

  /**
   * Add a detected intent. Persists to conversation metadata.
   */
  async addIntent(sessionId: string, intent: DetectedIntent): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.detectedIntents = [...session.detectedIntents, intent];
    session.updatedAt = new Date();

    await prisma.conversation.update({
      where: { id: sessionId },
      data: {
        metadata: JSON.parse(JSON.stringify({
          businessSlug: session.businessSlug,
          detectedIntents: session.detectedIntents,
        })),
      },
    });
  }

  /**
   * Evict stale sessions from in-memory cache (older than 24h).
   */
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
