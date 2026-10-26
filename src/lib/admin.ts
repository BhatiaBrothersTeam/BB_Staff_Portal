import "server-only";
import { notFound } from "next/navigation";
import { getSession } from "./auth";
import type { PortalSession } from "./types";

// Who counts as a portal admin (can read the activity log and manage API
// keys). Set by env so it can change without a deploy:
//   PORTAL_ADMIN_GROUPS  Keycloak group names, comma-separated (default "Admin")
//   PORTAL_ADMIN_USERS   extra login names, comma-separated (e.g. for the demo login)

function envList(name: string, fallback: string[] = []): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(session: PortalSession | null): boolean {
  if (!session) return false;
  const adminGroups = envList("PORTAL_ADMIN_GROUPS", ["admin"]);
  const adminUsers = envList("PORTAL_ADMIN_USERS");
  return (
    session.groups.some((group) => adminGroups.includes(group.toLowerCase())) ||
    adminUsers.includes(session.username.toLowerCase())
  );
}

/**
 * The current session if it belongs to an admin. Anyone else gets a 404, so
 * the admin pages don't advertise that they exist.
 */
export async function requireAdmin(): Promise<PortalSession> {
  const session = await getSession();
  if (!session || !isAdmin(session)) notFound();
  return session;
}
