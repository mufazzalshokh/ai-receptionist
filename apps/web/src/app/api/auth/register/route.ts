import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@ai-receptionist/db";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  businessSlug: z.string().min(1).max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Only allow registration when no users exist (initial setup)
    // or when request comes from a SUPER_ADMIN session
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      // For now, block public registration after first user.
      // Future: check caller is SUPER_ADMIN to allow adding users.
      return NextResponse.json(
        { success: false, error: "Registration is disabled. Contact your administrator." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, businessSlug } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: userCount === 0 ? "SUPER_ADMIN" : "BUSINESS_OWNER",
      },
    });

    // Link to business if slug provided
    if (businessSlug) {
      const business = await prisma.business.findUnique({
        where: { slug: businessSlug },
      });

      if (business) {
        await prisma.userBusiness.create({
          data: {
            userId: user.id,
            businessId: business.id,
            role: "ADMIN",
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
