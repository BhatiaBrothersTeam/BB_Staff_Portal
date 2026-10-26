import { NextResponse, type NextRequest } from "next/server";
import { readSessionToken } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

export async function proxy(request: NextRequest) {
  // Check the signature, not just that a cookie exists: a hand-made or
  // expired bb_session must not get past this point.
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  return NextResponse.next();
}

export const config = {
  // `/dashboard/:path*` also covers /dashboard itself.
  matcher: ["/dashboard/:path*", "/app/:path*"],
};
