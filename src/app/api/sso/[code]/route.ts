import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { mintSsoHandoffToken, SSO_TARGETS } from "@/lib/sso";

// Step 1 of the SSO handoff (see src/lib/sso.ts for the full flow). An
// SSO-enabled tile (see AppTile.tsx) navigates the browser here instead of
// to /app/[code]. We mint a short-lived token for the portal's own session
// and bounce the browser straight on to the agent app's own /auth/sso
// endpoint, which exchanges it for a real session there.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ssoTarget = SSO_TARGETS[code.toUpperCase()];
  const targetBaseUrl = ssoTarget?.url;

  if (!ssoTarget || !targetBaseUrl) {
    // Not an SSO-enabled app (or its env var isn't configured) — nothing to
    // hand off to, so just send the user back to the portal.
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const token = await mintSsoHandoffToken(ssoTarget, {
    sub: session.username.toLowerCase(),
    name: session.user,
    role: "staff",
    email: session.email,
  });

  const target = new URL("/auth/sso", targetBaseUrl);
  target.searchParams.set("token", token);

  return NextResponse.redirect(target);
}
