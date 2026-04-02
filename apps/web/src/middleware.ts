import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes — no auth required
  const publicPaths = [
    "/login",
    "/api/auth",
    "/api/chat",           // Widget chat endpoint (has its own API key auth later)
    "/api/widget/config",  // Widget config endpoint
    "/api/voice/incoming", // Twilio webhook (has signature validation)
    "/api/voice/process",  // Twilio webhook
    "/demo",
    "/",
  ];

  const isPublic = publicPaths.some((path) =>
    pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // Protected routes — require authentication
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
