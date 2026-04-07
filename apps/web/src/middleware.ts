import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is handled at the route and page level:
// - API routes return 401 in the route handler
// - Dashboard pages redirect via getSessionBusiness()
// Middleware is a lightweight passthrough to avoid Edge Runtime size limits.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
