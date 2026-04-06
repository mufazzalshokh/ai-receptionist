import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@ai-receptionist/db";
import { authConfig } from "@/auth.config";

interface SessionBusiness {
  userId: string;
  businessId: string;
  businessSlug: string;
}

export async function getSessionBusiness(): Promise<SessionBusiness | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const businessId = session.user.businessId;
  const businessSlug = session.user.businessSlug;

  if (businessId && businessSlug) {
    return { userId: session.user.id, businessId, businessSlug };
  }

  // JWT claims missing — look up the user's linked business from DB
  const link = await prisma.userBusiness.findFirst({
    where: { userId: session.user.id },
    include: { business: { select: { id: true, slug: true } } },
  });

  if (!link) return null;

  return {
    userId: session.user.id,
    businessId: link.business.id,
    businessSlug: link.business.slug,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            businesses: {
              include: { business: true },
            },
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await compare(password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businesses[0]?.business.id ?? null,
          businessSlug: user.businesses[0]?.business.slug ?? null,
        };
      },
    }),
  ],
});
