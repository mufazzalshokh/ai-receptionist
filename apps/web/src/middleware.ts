import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) return NextResponse.next();

  // Read next-auth v5 session cookie (name differs in dev vs prod)
  const token =
    req.cookies.get("authjs.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!token) {
    return unauthorized(req, pathname);
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""
    );
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return unauthorized(req, pathname);
  }
}

function unauthorized(req: NextRequest, pathname: string): NextResponse {
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
