export type AppGroup = "apps" | "agents";

export interface AppConfig {
  code: string;
  name: string;
  group: AppGroup;
  description: string;
  /**
   * True for agent apps that are real, separate deployments trusting this
   * portal's login over a signed-token SSO handoff (see src/lib/sso.ts)
   * instead of the internal /app/[code] placeholder screen.
   */
  ssoEnabled?: boolean;
}

/**
 * Everything the portal knows about a signed-in person. Lives server-side
 * only, inside the signed bb_session cookie (see src/lib/auth.ts).
 */
export interface PortalSession {
  /** Keycloak user id (`sub`), or "demo" for the demo login. */
  sub: string;
  /** Login name (Keycloak `preferred_username`). */
  username: string;
  /** Display name shown in the UI. */
  user: string;
  email?: string;
  /** Keycloak group names (e.g. "Sales"), without the leading "/". */
  groups: string[];
  since: number;
  /** Keycloak ID token, kept so sign-out can end the Keycloak session too. */
  idToken?: string;
}

/** The subset of PortalSession that is safe to hand to client components. */
export interface CookieSession {
  user: string;
  since: number;
  groups: string[];
}

export interface SessionData {
  user: string;
  since: number;
  groups: string[];
  opened: string[];
}
