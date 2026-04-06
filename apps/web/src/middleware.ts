import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes — no auth required
  const publicPaths = [
    "/login",
    "/api/auth",
    "/api/chat",
    "/api/widget/config",
    "/api/voice/incoming",
    "/api/voice/process",
    "/demo",
    "/",
  ];

  const isPublic = publicPaths.some((path) =>
    pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  if (!req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
