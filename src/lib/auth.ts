import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./session";
import type { CookieSession, PortalSession } from "./types";

// --- Portal session --------------------------------------------------------
//
// After Keycloak (or the demo login) confirms who someone is, the portal
// keeps that in the bb_session cookie as a JWT signed with SESSION_SECRET.
// The cookie is httpOnly, so page scripts can't read it, and any edit to it
// breaks the signature, so readSessionToken() rejects it.

const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set — required to sign the portal session cookie.");
  }
  return new TextEncoder().encode(secret);
}

export const sessionCookieOptions = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: SESSION_TTL_SECONDS,
} as const;

export async function createSessionToken(session: PortalSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function readSessionToken(token: string | undefined | null): Promise<PortalSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ["HS256"] });
    const { sub, username, user, email, groups, since, idToken } = payload;
    if (
      typeof sub !== "string" ||
      typeof username !== "string" ||
      typeof user !== "string" ||
      typeof since !== "number" ||
      !Array.isArray(groups)
    ) {
      return null;
    }
    return {
      sub,
      username,
      user,
      email: typeof email === "string" ? email : undefined,
      groups: groups.filter((g): g is string => typeof g === "string"),
      since,
      idToken: typeof idToken === "string" ? idToken : undefined,
    };
  } catch {
    // expired, tampered with, or not one of ours
    return null;
  }
}

/** The current request's session, for Server Components and Route Handlers. */
export async function getSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export function toCookieSession(session: PortalSession | null): CookieSession | null {
  if (!session) return null;
  return { user: session.user, since: session.since, groups: session.groups };
}

// --- Demo login ------------------------------------------------------------
//
// The old Demo/Demo form, kept for local work without Keycloak. Off unless
// DEMO_LOGIN=true, and never meant for a real deployment.
const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "Demo";

export function isDemoLoginEnabled(): boolean {
  return process.env.DEMO_LOGIN === "true";
}

export function validateCredentials(username: string, password: string): boolean {
  return username.trim().toLowerCase() === DEMO_USERNAME && password === DEMO_PASSWORD;
}

export function toDisplayName(username: string): string {
  const trimmed = username.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
