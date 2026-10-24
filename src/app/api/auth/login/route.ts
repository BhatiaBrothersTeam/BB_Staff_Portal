import { NextResponse, type NextRequest } from "next/server";
import {
  buildAuthorizationUrl,
  getPortalUrl,
  isKeycloakEnabled,
  OIDC_COOKIE,
  randomToken,
  safeReturnPath,
} from "@/lib/keycloak";

// Step 1 of Keycloak sign-in (see src/lib/keycloak.ts): send the browser to
// Keycloak's login page, remembering what we need to check the reply.
export async function GET(request: NextRequest) {
  const portalUrl = getPortalUrl(request.url);

  if (!isKeycloakEnabled()) {
    return NextResponse.redirect(new URL("/login?error=not_configured", portalUrl));
  }

  const state = randomToken();
  const nonce = randomToken();
  const codeVerifier = randomToken();
  const from = safeReturnPath(request.nextUrl.searchParams.get("from"));

  let authorizationUrl: URL;
  try {
    authorizationUrl = await buildAuthorizationUrl({
      redirectUri: `${portalUrl}/api/auth/callback`,
      state,
      nonce,
      codeVerifier,
    });
  } catch (error) {
    console.error("[auth] Could not reach Keycloak:", error);
    return NextResponse.redirect(new URL("/login?error=unavailable", portalUrl));
  }

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(OIDC_COOKIE, JSON.stringify({ state, nonce, codeVerifier, from }), {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "lax" so the cookie still comes back on Keycloak's top-level redirect.
    sameSite: "lax",
    maxAge: 60 * 10,
  });
  return response;
}
