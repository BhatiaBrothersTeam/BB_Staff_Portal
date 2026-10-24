"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  isDemoLoginEnabled,
  sessionCookieOptions,
  toDisplayName,
  validateCredentials,
} from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

export interface LoginState {
  error: string | null;
}

// Demo-only sign-in (DEMO_LOGIN=true). Real staff sign in through Keycloak
// via /api/auth/login instead.
export async function signInAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  if (!isDemoLoginEnabled()) {
    return { error: "Demo sign-in is turned off. Use Sign in with Keycloak." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter both username and password." };
  }

  if (!validateCredentials(username, password)) {
    return { error: "Username or password is incorrect. Check the details and try again." };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    await createSessionToken({
      sub: "demo",
      username: username.toLowerCase(),
      user: toDisplayName(username),
      groups: [],
      since: Date.now(),
    }),
    sessionCookieOptions,
  );

  redirect("/dashboard");
}
