import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { exchangeCode, getPortalUrl, OIDC_COOKIE, safeReturnPath } from "@/lib/keycloak";
import { SESSION_COOKIE } from "@/lib/session";

interface PendingSignIn {
  state: string;
  nonce: string;
  codeVerifier: string;
  from: string;
}

function readPendingSignIn(raw: string | undefined): PendingSignIn | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (
      typeof data?.state === "string" &&
      typeof data.nonce === "string" &&
      typeof data.codeVerifier === "string" &&
      typeof data.from === "string"
    ) {
      return data;
    }
  } catch {
    // ignore malformed cookie
  }
  return null;
}

// Step 2 of Keycloak sign-in (see src/lib/keycloak.ts): Keycloak sends the
// browser back here with a one-time code, which we trade for the user's
// verified identity and turn into a portal session.
export async function GET(request: NextRequest) {
  const portalUrl = getPortalUrl(request.url);
  const params = request.nextUrl.searchParams;
  const pending = readPendingSignIn(request.cookies.get(OIDC_COOKIE)?.value);

  function fail(reason: string) {
    const response = NextResponse.redirect(new URL(`/login?error=${reason}`, portalUrl));
    response.cookies.delete(OIDC_COOKIE);
    return response;
  }

  if (params.get("error")) {
    return fail(params.get("error") === "access_denied" ? "denied" : "keycloak");
  }

  const code = params.get("code");
  if (!pending || !code || params.get("state") !== pending.state) {
    return fail("expired");
  }

  let identity;
  try {
    identity = await exchangeCode({
      code,
      codeVerifier: pending.codeVerifier,
      redirectUri: `${portalUrl}/api/auth/callback`,
      nonce: pending.nonce,
    });
  } catch (error) {
    console.error("[auth] Keycloak sign-in failed:", error);
    return fail("keycloak");
  }

  const token = await createSessionToken({
    sub: identity.sub,
    username: identity.username,
    user: identity.name,
    email: identity.email,
    groups: identity.groups,
    since: Date.now(),
    idToken: identity.idToken,
  });

  const response = NextResponse.redirect(new URL(safeReturnPath(pending.from), portalUrl));
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  response.cookies.delete(OIDC_COOKIE);
  return response;
}
