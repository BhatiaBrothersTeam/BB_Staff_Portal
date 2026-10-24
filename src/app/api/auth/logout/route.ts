import { NextResponse, type NextRequest } from "next/server";
import { readSessionToken } from "@/lib/auth";
import { buildLogoutUrl, getPortalUrl, isKeycloakEnabled } from "@/lib/keycloak";
import { SESSION_COOKIE } from "@/lib/session";

// "Sign out of all apps" posts here. Clearing the portal cookie alone would
// leave the Keycloak session alive, so the next "Sign in with Keycloak"
// would let the person straight back in. We also send the browser through
// Keycloak's logout endpoint, which then returns it to /login.
export async function POST(request: NextRequest) {
  const portalUrl = getPortalUrl(request.url);
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  let target = new URL("/login", portalUrl);

  if (session?.idToken && isKeycloakEnabled()) {
    try {
      target = await buildLogoutUrl({ idToken: session.idToken, postLogoutRedirectUri: `${portalUrl}/login` });
    } catch (error) {
      // Keycloak unreachable: still sign out of the portal itself.
      console.error("[auth] Could not reach Keycloak to end its session:", error);
    }
  }

  // 303 so the browser follows with a GET.
  const response = NextResponse.redirect(target, 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
