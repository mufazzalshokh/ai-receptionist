import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    business: { findUnique: vi.fn() },
    conversation: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    message: { create: vi.fn() },
    lead: { upsert: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@ai-receptionist/db", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/logger", () => ({
  createModuleLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Import after mocks
const { conversationStore } = await import("../lib/conversation-store");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ConversationStore.create", () => {
  it("creates a conversation in DB and returns a session", async () => {
    mockPrisma.business.findUnique.mockResolvedValue({ id: "biz-cuid-1" });
    mockPrisma.conversation.create.mockResolvedValue({});

    const session = await conversationStore.create({
      id: "conv-1",
      businessSlug: "vividerm",
      channel: "chat",
      language: "en",
      isAfterHours: false,
    });

    expect(session.id).toBe("conv-1");
    expect(session.businessSlug).toBe("vividerm");
    expect(session.dbBusinessId).toBe("biz-cuid-1");
    expect(session.messages).toEqual([]);
    expect(session.detectedIntents).toEqual([]);

    expect(mockPrisma.conversation.create).toHaveBeenCalledOnce();
    expect(mockPrisma.conversation.create.mock.calls[0][0].data).toMatchObject({
      id: "conv-1",
      businessId: "biz-cuid-1",
      channel: "chat",
      language: "en",
      status: "active",
      metadata: { businessSlug: "vividerm", detectedIntents: [] },
    });
  });

  it("throws when business not found", async () => {
    mockPrisma.business.findUnique.mockResolvedValue(null);

    await expect(
      conversationStore.create({
        id: "conv-2",
        businessSlug: "nonexistent",
        channel: "chat",
        language: "en",
        isAfterHours: false,
      })
    ).rejects.toThrow("Business not found: nonexistent");
  });
});

describe("ConversationStore.getOrLoad", () => {
  it("returns from cache when session exists in memory", async () => {
    mockPrisma.business.findUnique.mockResolvedValue({ id: "biz-cuid-1" });
    mockPrisma.conversation.create.mockResolvedValue({});

    // Create a session to populate the cache
    const created = await conversationStore.create({
      id: "conv-cache-hit",
      businessSlug: "vividerm",
      channel: "chat",
      language: "en",
      isAfterHours: false,
    });

    const loaded = await conversationStore.getOrLoad("conv-cache-hit", false);
    expect(loaded).toBe(created); // Same reference = cache hit
    expect(mockPrisma.conversation.findUnique).not.toHaveBeenCalled();
  });

  it("loads from DB when not in cache", async () => {
    const now = new Date();
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: "conv-db-load",
      channel: "chat",
      language: "lv",
      status: "active",
      metadata: { businessSlug: "vividerm", detectedIntents: [{ intent: "general_inquiry", confidence: 0.9, entities: {} }] },
      createdAt: now,
      updatedAt: now,
      business: { id: "biz-cuid-1", slug: "vividerm" },
      messages: [
        { id: "msg-1", role: "user", content: "Sveiki", language: "lv", createdAt: now, metadata: null },
        { id: "msg-2", role: "assistant", content: "Labdien!", language: "lv", createdAt: now, metadata: null },
      ],
      lead: null,
    });

    const session = await conversationStore.getOrLoad("conv-db-load", true);

    expect(session).toBeDefined();
    expect(session!.id).toBe("conv-db-load");
    expect(session!.businessSlug).toBe("vividerm");
    expect(session!.language).toBe("lv");
    expect(session!.messages).toHaveLength(2);
    expect(session!.messages[0].content).toBe("Sveiki");
    expect(session!.detectedIntents).toHaveLength(1);
    expect(session!.isAfterHours).toBe(true);
  });

  it("returns undefined when conversation not in DB", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

    const session = await conversationStore.getOrLoad("nonexistent-id", false);
    expect(session).toBeUndefined();
  });

  it("returns undefined and logs error on DB failure", async () => {
    mockPrisma.conversation.findUnique.mockRejectedValue(new Error("DB down"));

    const session = await conversationStore.getOrLoad("error-id", false);
    expect(session).toBeUndefined();
  });
});

describe("ConversationStore.addMessage", () => {
  it("persists message to DB and updates in-memory array", async () => {
    mockPrisma.business.findUnique.mockResolvedValue({ id: "biz-cuid-1" });
    mockPrisma.conversation.create.mockResolvedValue({});
    mockPrisma.message.create.mockResolvedValue({});

    const session = await conversationStore.create({
      id: "conv-msg",
      businessSlug: "vividerm",
      channel: "chat",
      language: "en",
      isAfterHours: false,
    });

    await conversationStore.addMessage("conv-msg", {
      id: "msg-1",
      role: "user",
      content: "Hello!",
      language: "en",
      timestamp: new Date(),
    });

    expect(mockPrisma.message.create).toHaveBeenCalledOnce();
    expect(mockPrisma.message.create.mock.calls[0][0].data).toMatchObject({
      conversationId: "conv-msg",
      role: "user",
      content: "Hello!",
      language: "en",
    });
    expect(session.messages).toHaveLength(1);
    expect(session.messages[0].content).toBe("Hello!");
  });
});

describe("ConversationStore.updateLead", () => {
  it("upserts lead to DB when contact info present", async () => {
    mockPrisma.business.findUnique.mockResolvedValue({ id: "biz-cuid-1" });
    mockPrisma.conversation.create.mockResolvedValue({});
    mockPrisma.lead.upsert.mockResolvedValue({});

    await conversationStore.create({
      id: "conv-lead",
      businessSlug: "vividerm",
      channel: "chat",
      language: "en",
      isAfterHours: false,
    });

    await conversationStore.updateLead("conv-lead", { name: "Anna", phone: "+371200" });

    expect(mockPrisma.lead.upsert).toHaveBeenCalledOnce();
    expect(mockPrisma.lead.upsert.mock.calls[0][0].create).toMatchObject({
      businessId: "biz-cuid-1",
      conversationId: "conv-lead",
      name: "Anna",
      phone: "+371200",
    });
  });

  it("skips DB upsert when no contact info", async () => {
    mockPrisma.business.findUnique.mockResolvedValue({ id: "biz-cuid-1" });
    mockPrisma.conversation.create.mockResolvedValue({});

    await conversationStore.create({
      id: "conv-lead-skip",
      businessSlug: "vividerm",
      channel: "chat",
      language: "en",
      isAfterHours: false,
    });

    await conversationStore.updateLead("conv-lead-skip", { score: "warm" });

    expect(mockPrisma.lead.upsert).not.toHaveBeenCalled();
  });
});

describe("ConversationStore.updateLanguage", () => {
  it("updates language in DB and in-memory", async () => {
    mockPrisma.business.findUnique.mockResolvedValue({ id: "biz-cuid-1" });
    mockPrisma.conversation.create.mockResolvedValue({});
    mockPrisma.conversation.update.mockResolvedValue({});

    const session = await conversationStore.create({
      id: "conv-lang",
      businessSlug: "vividerm",
      channel: "chat",
      language: "en",
      isAfterHours: false,
    });

    await conversationStore.updateLanguage("conv-lang", "lv");

    expect(session.language).toBe("lv");
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
      where: { id: "conv-lang" },
      data: { language: "lv" },
    });
  });
});

describe("ConversationStore.addIntent", () => {
  it("persists intents to conversation metadata", async () => {
    mockPrisma.business.findUnique.mockResolvedValue({ id: "biz-cuid-1" });
    mockPrisma.conversation.create.mockResolvedValue({});
    mockPrisma.conversation.update.mockResolvedValue({});

    const session = await conversationStore.create({
      id: "conv-intent",
      businessSlug: "vividerm",
      channel: "chat",
      language: "en",
      isAfterHours: false,
    });

    const intent = { intent: "general_inquiry" as const, confidence: 0.95, entities: {} };
    await conversationStore.addIntent("conv-intent", intent);

    expect(session.detectedIntents).toHaveLength(1);
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
      where: { id: "conv-intent" },
      data: {
        metadata: {
          businessSlug: "vividerm",
          detectedIntents: [intent],
        },
      },
    });
  });
});
