"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppGrid } from "./AppGrid";
import { useSession } from "./SessionProvider";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function DashboardView({ isAdmin = false }: { isAdmin?: boolean }) {
  const { session } = useSession();
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only date avoids SSR/CSR locale mismatch
    setToday(
      new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }),
    );
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[clamp(24px,3vw,32px)] font-extrabold">
            Welcome, {session?.user ?? "there"}
          </h2>
          <p className="mt-1 text-muted">Choose an app or agent. You are already signed in to all of them.</p>
          {isAdmin ? (
            <nav aria-label="Admin" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              <Link href="/dashboard/activity" className="font-semibold underline decoration-silver underline-offset-4 hover:text-accent">
                Activity log
              </Link>
              <Link href="/dashboard/api-keys" className="font-semibold underline decoration-silver underline-offset-4 hover:text-accent">
                API keys
              </Link>
            </nav>
          ) : null}
        </div>
        <div className="grid gap-0.5 text-right font-mono-brand text-[12.5px] text-muted">
          <span suppressHydrationWarning>{today}</span>
          {session ? <span>Signed in at {formatTime(session.since)}</span> : null}
        </div>
      </div>

      <AppGrid />

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
        <span>Demo build. Each tile opens a sample screen in place of the live app.</span>
        <span>Bhatia Brothers · Internal use</span>
      </footer>
    </>
  );
}
