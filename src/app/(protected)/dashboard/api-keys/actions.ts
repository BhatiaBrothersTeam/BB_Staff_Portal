"use server";

import { refresh } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { issueApiKey, revokeApiKey } from "@/lib/apiKeys";
import { getAppByCode } from "@/lib/apps";
import { getSession } from "@/lib/auth";

export interface KeyActionState {
  /** The new plaintext key. Returned once, straight to the admin who made it. */
  apiKey: string | null;
  error: string | null;
}

// Server Actions are public endpoints, so each one re-checks the session
// itself rather than trusting that only the admin page can call it.
async function adminUsername(): Promise<string | null> {
  const session = await getSession();
  return session && isAdmin(session) ? session.username : null;
}

export async function issueKeyAction(_prev: KeyActionState, formData: FormData): Promise<KeyActionState> {
  const username = await adminUsername();
  if (!username) return { apiKey: null, error: "Only portal admins can manage API keys." };

  const app = getAppByCode(String(formData.get("app") ?? ""));
  if (!app) return { apiKey: null, error: "Unknown app." };

  try {
    const apiKey = await issueApiKey(app, username);
    refresh();
    return { apiKey, error: null };
  } catch (err) {
    console.error("[api-keys] could not issue a key", err);
    return { apiKey: null, error: "Couldn't save the key. Check the database connection and try again." };
  }
}

export async function revokeKeyAction(_prev: KeyActionState, formData: FormData): Promise<KeyActionState> {
  const username = await adminUsername();
  if (!username) return { apiKey: null, error: "Only portal admins can manage API keys." };

  const app = getAppByCode(String(formData.get("app") ?? ""));
  if (!app) return { apiKey: null, error: "Unknown app." };

  try {
    await revokeApiKey(app.code);
    refresh();
    return { apiKey: null, error: null };
  } catch (err) {
    console.error("[api-keys] could not revoke a key", err);
    return { apiKey: null, error: "Couldn't revoke the key. Check the database connection and try again." };
  }
}
