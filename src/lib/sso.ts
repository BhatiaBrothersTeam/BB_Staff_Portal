import { SignJWT } from "jose";

// --- Cross-app SSO handoff -------------------------------------------------
//
// The portal is the only place that checks a password. Every agent app
// trusts the portal instead of running its own login screen. The handoff
// works like this:
//
//   1. The user is already signed in to the portal (bb_session cookie).
//   2. They click an SSO-enabled tile. The browser is sent to this app's
//      `/api/sso/[code]` route (see src/app/api/sso/[code]/route.ts), which
//      mints a SHORT-LIVED (60s) signed JWT naming who they are and
//      redirects to `${agentBaseUrl}/auth/sso?token=...`.
//   3. The agent app verifies that token with the SAME shared secret,
//      mints its OWN longer-lived session, and the user lands signed in —
//      no second password.
//
// Because the token is only valid for ~60 seconds and is only ever used
// once (to mint a real session), it's safe to pass as a URL query param.
//
// To onboard another agent app (Job Card Agent, CRM Agent, ...):
//   1. Add its app code, public URL env var and its own secret env var to
//      SSO_TARGETS below.
//   2. Implement the same `/auth/sso` (verify + set session cookie) and
//      `/api/auth/logout` pattern in that app — see the Lead Gen Agent's
//      backend/api/routes/auth.py and src/auth/SsoHandler.tsx for a
//      reference implementation.
//   3. Mark the app's entry in src/lib/apps.ts with `ssoEnabled: true`.

const HANDOFF_TOKEN_TTL = "60s";

export interface SsoTarget {
  /** Public origin of the agent app. */
  url: string | undefined;
  /** Name of the env var holding the secret this app verifies tokens with. */
  secretEnv: string;
  /**
   * Set as the token's `aud`, so a token minted for one app is refused by
   * another. Left off for the Lead Gen Agent, whose verifier predates it and
   * would reject a token carrying an audience it was not told to expect.
   */
  audience?: string;
}

function getHandoffSecret(target: SsoTarget): Uint8Array {
  const secret = process.env[target.secretEnv];
  if (!secret) {
    throw new Error(`${target.secretEnv} is not set — required to mint SSO handoff tokens.`);
  }
  return new TextEncoder().encode(secret);
}

export interface SsoClaims {
  /** Stable user identifier (demo: the lowercased username). */
  sub: string;
  /** Display name, shown in the agent app's own UI after handoff. */
  name: string;
  /** Coarse access/role claim the agent app can use for its own authorization. */
  role: string;
  /** Keycloak email. The Job Card Agent finds its own account by this. */
  email?: string;
}

export async function mintSsoHandoffToken(target: SsoTarget, claims: SsoClaims): Promise<string> {
  const payload: Record<string, string> = { name: claims.name, role: claims.role };
  if (claims.email) payload.email = claims.email;

  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(HANDOFF_TOKEN_TTL);
  if (target.audience) jwt.setAudience(target.audience);
  return jwt.sign(getHandoffSecret(target));
}

// Every agent app that accepts an SSO handoff from this portal, keyed by the
// app code used throughout src/lib/apps.ts. Each new app gets its own secret,
// so whoever holds one app's secret cannot mint sign-ins for the others.
export const SSO_TARGETS: Record<string, SsoTarget> = {
  LGA: { url: process.env.NEXT_PUBLIC_LEAD_GEN_URL, secretEnv: "JWT_SECRET" },
  JCA: { url: process.env.NEXT_PUBLIC_JOB_CARD_URL, secretEnv: "JOB_CARD_SSO_SECRET", audience: "job-card-agent" },
};
