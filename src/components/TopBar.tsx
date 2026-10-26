"use client";

import { useState } from "react";
import { SSO_TARGETS } from "@/lib/sso";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import { useSession } from "./SessionProvider";

// "Sign out of all apps" means all of them: every agent app that accepted an
// SSO handoff (see src/lib/sso.ts) got its own session cookie on its own
// origin, which this portal's cookie clear can't touch. We ask each one to
// clear its session too via a credentialed cross-origin fetch to its
// /api/auth/logout endpoint. Best-effort — an unreachable agent app
// shouldn't block signing out of the portal itself. `keepalive` lets the
// requests finish even though the page navigates away straight after.
function signOutOfAgentApps() {
  for (const { url: baseUrl } of Object.values(SSO_TARGETS)) {
    if (!baseUrl) continue;
    fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      mode: "cors",
      keepalive: true,
    }).catch(() => {});
  }
}

export function TopBar() {
  const { session, clearOpened } = useSession();
  const [isPending, setIsPending] = useState(false);

  // The form posts to /api/auth/logout as a real navigation, which clears the
  // portal session and passes through Keycloak's logout on the way to /login.
  function handleSignOut() {
    setIsPending(true);
    signOutOfAgentApps();
    clearOpened();
  }

  return (
    <header className="sticky top-0 z-10 border-b-2 border-silver bg-navy text-navy-ink">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <BrandMark size="small" />
        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle variant="ghost" />
          <div className="flex items-center gap-2.5 text-sm">
            <div
              className="grid h-[30px] w-[30px] flex-none place-items-center rounded-full bg-silver font-display text-[13px] font-extrabold text-navy"
              aria-hidden="true"
            >
              {session ? session.user.charAt(0).toUpperCase() : "?"}
            </div>
            <span className="hidden sm:inline">{session?.user ?? "—"}</span>
          </div>
          <form action="/api/auth/logout" method="post" onSubmit={handleSignOut}>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-[4px] border border-[color-mix(in_srgb,var(--navy-ink)_35%,transparent)] px-3 py-1.5 text-[13px] hover:border-silver hover:text-silver-hi disabled:opacity-60"
            >
              {isPending ? "Signing out…" : "Sign out of all apps"}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
