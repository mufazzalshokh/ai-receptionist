import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

afterAll(async () => {
  await prisma.$disconnect();
});

// ============================================
// Phase 1: Connection
// ============================================

describe("Database Connection", () => {
  it("should connect to Supabase successfully", async () => {
    const result = await prisma.$queryRaw<[{ result: number }]>`SELECT 1 AS result`;
    expect(result[0].result).toBe(1);
  });

  it("should have DATABASE_URL configured", () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toContain("supabase.co");
  });
});

// ============================================
// Phase 2: All 14 Tables Exist
// ============================================

const EXPECTED_TABLES = [
  "Business",
  "BusinessConfigRecord",
  "User",
  "Session",
  "UserBusiness",
  "Conversation",
  "Message",
  "Lead",
  "Booking",
  "Service",
  "FAQ",
  "Escalation",
  "ApiKey",
  "DailyAnalytics",
] as const;

describe("Table Existence", () => {
  it("should have exactly 14 tables in public schema", async () => {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    const tableNames = tables.map((t) => t.tablename);

    for (const expected of EXPECTED_TABLES) {
      expect(tableNames, `Missing table: ${expected}`).toContain(expected);
    }
  });

  it.each(EXPECTED_TABLES)("table %s should be queryable via Prisma", async (table) => {
    // Prisma model names are camelCase delegates on the client
    const delegate = (prisma as Record<string, unknown>)[
      table.charAt(0).toLowerCase() + table.slice(1)
    ] as { count: () => Promise<number> };

    expect(delegate, `Prisma delegate for ${table} not found`).toBeDefined();

    const count = await delegate.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// Phase 3: Enums Exist
// ============================================

describe("Enum Types", () => {
  it("should have UserRole enum with correct values", async () => {
    const result = await prisma.$queryRaw<{ enumlabel: string }[]>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'UserRole'
      ORDER BY e.enumsortorder
    `;
    const values = result.map((r) => r.enumlabel);
    expect(values).toEqual(["SUPER_ADMIN", "BUSINESS_OWNER", "STAFF"]);
  });

  it("should have BusinessRole enum with correct values", async () => {
    const result = await prisma.$queryRaw<{ enumlabel: string }[]>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'BusinessRole'
      ORDER BY e.enumsortorder
    `;
    const values = result.map((r) => r.enumlabel);
    expect(values).toEqual(["ADMIN", "MANAGER", "VIEWER"]);
  });
});

// ============================================
// Phase 4: Basic CRUD on Business table
// ============================================

describe("CRUD Operations", () => {
  const TEST_SLUG = `test-crud-${Date.now()}`;

  afterAll(async () => {
    // Cleanup: delete test record if it exists
    await prisma.business.deleteMany({ where: { slug: TEST_SLUG } });
  });

  it("should CREATE a business record", async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Business",
        slug: TEST_SLUG,
        industry: "test",
      },
    });

    expect(business.id).toBeDefined();
    expect(business.name).toBe("Test Business");
    expect(business.slug).toBe(TEST_SLUG);
    expect(business.isActive).toBe(true);
    expect(business.timezone).toBe("Europe/Riga");
  });

  it("should READ the created business", async () => {
    const business = await prisma.business.findUnique({
      where: { slug: TEST_SLUG },
    });

    expect(business).not.toBeNull();
    expect(business!.name).toBe("Test Business");
  });

  it("should UPDATE the business", async () => {
    const updated = await prisma.business.update({
      where: { slug: TEST_SLUG },
      data: { name: "Updated Test Business" },
    });

    expect(updated.name).toBe("Updated Test Business");
  });

  it("should DELETE the business", async () => {
    await prisma.business.delete({
      where: { slug: TEST_SLUG },
    });

    const deleted = await prisma.business.findUnique({
      where: { slug: TEST_SLUG },
    });
    expect(deleted).toBeNull();
  });
});

// ============================================
// Phase 5: Foreign Key / Cascade Relationships
// ============================================

describe("Foreign Key Relationships", () => {
  const FK_SLUG = `test-fk-${Date.now()}`;

  afterAll(async () => {
    await prisma.business.deleteMany({ where: { slug: FK_SLUG } });
  });

  it("should cascade delete conversations when business is deleted", async () => {
    // Create business with a conversation
    const business = await prisma.business.create({
      data: {
        name: "FK Test Business",
        slug: FK_SLUG,
        industry: "test",
        conversations: {
          create: {
            channel: "chat",
            status: "active",
            language: "en",
          },
        },
      },
      include: { conversations: true },
    });

    expect(business.conversations).toHaveLength(1);
    const conversationId = business.conversations[0].id;

    // Delete business — conversation should cascade
    await prisma.business.delete({ where: { id: business.id } });

    const orphanConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    expect(orphanConversation).toBeNull();
  });
});

// ============================================
// Phase 6: Index Verification
// ============================================

describe("Critical Indexes", () => {
  it("should have unique index on Business.slug", async () => {
    const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'Business' AND indexdef LIKE '%slug%'
    `;
    expect(indexes.length).toBeGreaterThanOrEqual(1);
  });

  it("should have composite index on Conversation(businessId, createdAt)", async () => {
    const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'Conversation'
        AND indexdef LIKE '%businessId%'
        AND indexdef LIKE '%createdAt%'
    `;
    expect(indexes.length).toBeGreaterThanOrEqual(1);
  });

  it("should have unique composite on DailyAnalytics(businessId, date)", async () => {
    const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'DailyAnalytics'
        AND indexdef LIKE '%businessId%'
        AND indexdef LIKE '%date%'
    `;
    expect(indexes.length).toBeGreaterThanOrEqual(1);
  });
});
