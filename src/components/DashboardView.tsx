"use client";

import { useEffect, useState } from "react";
import { AppGrid } from "./AppGrid";
import { useSession } from "./SessionProvider";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function DashboardView() {
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
