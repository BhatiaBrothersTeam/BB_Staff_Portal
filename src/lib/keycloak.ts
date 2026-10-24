import { base64url, createRemoteJWKSet, jwtVerify } from "jose";

// --- Keycloak sign-in (OpenID Connect) -------------------------------------
//
// The portal is a confidential "portal" client in the staff realm. Sign-in
// is the standard authorization-code flow with PKCE:
//
//   1. /api/auth/login sends the browser to Keycloak's login page, with a
//      random state, nonce and PKCE challenge (the matching secrets wait in
//      the short-lived bb_oidc cookie).
//   2. Keycloak sends the browser back to /api/auth/callback with a code.
//   3. The callback trades that code (plus the client secret and PKCE
//      verifier) for an ID token, checks the token's signature against
//      Keycloak's published keys, and starts the portal session.
//
// Sign-out (/api/auth/logout) clears the portal session and sends the browser
// to Keycloak's logout endpoint, which ends the Keycloak session as well.

export const OIDC_COOKIE = "bb_oidc";

interface KeycloakConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
}

function getKeycloakConfig(): KeycloakConfig | null {
  const issuer = process.env.KEYCLOAK_ISSUER;
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
  if (!issuer || !clientId || !clientSecret) return null;
  return { issuer: issuer.replace(/\/$/, ""), clientId, clientSecret };
}

function requireKeycloakConfig(): KeycloakConfig {
  const config = getKeycloakConfig();
  if (!config) {
    throw new Error("KEYCLOAK_ISSUER, KEYCLOAK_CLIENT_ID and KEYCLOAK_CLIENT_SECRET must all be set.");
  }
  return config;
}

export function isKeycloakEnabled(): boolean {
  return getKeycloakConfig() !== null;
}

interface OidcMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
}

let metadataPromise: Promise<OidcMetadata> | null = null;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

// Keycloak publishes its endpoints at a well-known address under the realm.
// Fetched once and cached; a failed fetch is dropped so the next request
// tries again (e.g. Keycloak was still starting).
function getMetadata(): Promise<OidcMetadata> {
  if (!metadataPromise) {
    const { issuer } = requireKeycloakConfig();
    metadataPromise = fetch(`${issuer}/.well-known/openid-configuration`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Keycloak discovery failed: HTTP ${res.status}`);
        return res.json() as Promise<OidcMetadata>;
      })
      .catch((error) => {
        metadataPromise = null;
        throw error;
      });
  }
  return metadataPromise;
}

async function getJwks() {
  if (!jwks) {
    const { jwks_uri } = await getMetadata();
    jwks = createRemoteJWKSet(new URL(jwks_uri));
  }
  return jwks;
}

export function randomToken(): string {
  return base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
}

async function pkceChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  return base64url.encode(new Uint8Array(digest));
}

/** The public origin of this portal, used for Keycloak's exact redirect URIs. */
export function getPortalUrl(requestUrl: string): string {
  return process.env.PORTAL_URL?.replace(/\/$/, "") ?? new URL(requestUrl).origin;
}

/** Only same-site paths, so `?from=` can't bounce someone to another site. */
export function safeReturnPath(from: string | null | undefined): string {
  if (!from || !from.startsWith("/") || from.startsWith("//") || from.startsWith("/\\")) {
    return "/dashboard";
  }
  return from;
}

export async function buildAuthorizationUrl(args: {
  redirectUri: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}): Promise<URL> {
  const { clientId } = requireKeycloakConfig();
  const { authorization_endpoint } = await getMetadata();
  const url = new URL(authorization_endpoint);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("state", args.state);
  url.searchParams.set("nonce", args.nonce);
  url.searchParams.set("code_challenge", await pkceChallenge(args.codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export interface KeycloakIdentity {
  sub: string;
  username: string;
  name: string;
  email?: string;
  groups: string[];
  idToken: string;
}

export async function exchangeCode(args: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  nonce: string;
}): Promise<KeycloakIdentity> {
  const { clientId, clientSecret } = requireKeycloakConfig();
  const metadata = await getMetadata();

  const res = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: args.redirectUri,
      code_verifier: args.codeVerifier,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Keycloak token exchange failed: HTTP ${res.status} ${await res.text()}`);
  }
  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) throw new Error("Keycloak token response had no id_token.");

  const { payload } = await jwtVerify(idToken, await getJwks(), {
    issuer: metadata.issuer,
    audience: clientId,
  });
  if (payload.nonce !== args.nonce) throw new Error("ID token nonce does not match.");
  if (!payload.sub) throw new Error("ID token has no subject.");

  const username = typeof payload.preferred_username === "string" ? payload.preferred_username : payload.sub;
  return {
    sub: payload.sub,
    username,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name : username,
    email: typeof payload.email === "string" ? payload.email : undefined,
    // Filled by the realm's "groups" mapper; full paths look like "/Sales".
    groups: Array.isArray(payload.groups)
      ? payload.groups.filter((g): g is string => typeof g === "string").map((g) => g.replace(/^\//, ""))
      : [],
    idToken,
  };
}

export async function buildLogoutUrl(args: { idToken: string; postLogoutRedirectUri: string }): Promise<URL> {
  const { clientId } = requireKeycloakConfig();
  const { end_session_endpoint } = await getMetadata();
  const url = new URL(end_session_endpoint);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("id_token_hint", args.idToken);
  url.searchParams.set("post_logout_redirect_uri", args.postLogoutRedirectUri);
  return url;
}
