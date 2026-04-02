import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@ai-receptionist/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
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
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.businessId = user.businessId;
        token.businessSlug = user.businessSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string | undefined;
        session.user.businessId = token.businessId as string | null | undefined;
        session.user.businessSlug = token.businessSlug as string | null | undefined;
      }
      return session;
    },
  },
});
