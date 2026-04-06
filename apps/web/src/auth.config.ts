import type { NextAuthConfig } from "next-auth";

/**
 * Lightweight auth config for Edge Runtime (middleware).
 * Must NOT import bcryptjs, Prisma, or any Node.js-only modules.
 * The full config with Credentials provider lives in lib/auth.ts.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      return !!auth?.user;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.businessId = (user as { businessId?: string }).businessId;
        token.businessSlug = (user as { businessSlug?: string }).businessSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as string | undefined;
        session.user.businessId = token.businessId as string | null | undefined;
        session.user.businessSlug = token.businessSlug as string | null | undefined;
      }
      return session;
    },
  },
};
