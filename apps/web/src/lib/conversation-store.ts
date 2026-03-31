import type {
  ConversationMessage,
  SupportedLanguage,
  ConversationChannel,
  LeadData,
  DetectedIntent,
} from "@ai-receptionist/types";

/**
 * In-memory conversation store for MVP.
 * Production: replace with Redis (Upstash) + PostgreSQL persistence.
 */

interface ConversationSession {
  id: string;
  businessId: string;
  channel: ConversationChannel;
  language: SupportedLanguage;
  messages: ConversationMessage[];
  lead: Partial<LeadData>;
  detectedIntents: DetectedIntent[];
  isAfterHours: boolean;
  createdAt: Date;
  updatedAt: Date;
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
    return session;
  }

  get(id: string): ConversationSession | undefined {
    return this.sessions.get(id);
  }

  addMessage(sessionId: string, message: ConversationMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Immutable update
    const updated: ConversationSession = {
      ...session,
      messages: [...session.messages, message],
      updatedAt: new Date(),
    };
    this.sessions.set(sessionId, updated);
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

  // Cleanup sessions older than 24h
  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, session] of this.sessions) {
      if (session.updatedAt.getTime() < cutoff) {
        this.sessions.delete(id);
      }
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
