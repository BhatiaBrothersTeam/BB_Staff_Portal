"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import type { AppConfig } from "@/lib/types";
import { HandoffOverlay } from "./HandoffOverlay";
import { SessionPanel } from "./SessionPanel";
import { useSession } from "./SessionProvider";

export function AppView({ app }: { app: AppConfig }) {
  const router = useRouter();
  const { markOpened } = useSession();
  const reduceMotion = useReducedMotion();
  const [opening, setOpening] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- enables a document.body portal target once on the client
    setMounted(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-arms the handoff animation when navigating between apps
    setOpening(true);
    const timer = setTimeout(
      () => {
        setOpening(false);
        markOpened(app.code);
      },
      reduceMotion ? 150 : 900,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.code]);

  return (
    <>
      {mounted
        ? createPortal(
            <AnimatePresence>{opening ? <HandoffOverlay appName={app.name} /> : null}</AnimatePresence>,
            document.body,
          )
        : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-sm border border-line bg-accent-soft px-2 py-0.5 font-mono-brand text-xs tracking-wide text-ink">
            {app.code}
          </span>
          <h2 className="font-display text-[clamp(22px,3vw,30px)] font-extrabold">{app.name}</h2>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-[4px] border border-line bg-surface px-3.5 py-2 text-[13.5px] transition-colors hover:border-accent"
        >
          ← Back to portal
        </button>
      </div>

      <div role="status" className="flex items-start gap-3 rounded-sm border border-[color-mix(in_srgb,var(--ok)_40%,transparent)] bg-ok-soft px-4 py-3.5">
        <div
          className="mt-0.5 grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-ok text-[13px] font-bold text-surface"
          aria-hidden="true"
        >
          ✓
        </div>
        <div>
          <b className="text-ok">Signed in automatically — no second password needed.</b>{" "}
          <span>{app.name} used your portal sign-in, so no second password was needed.</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="grid min-h-[220px] content-center gap-2 rounded-sm border-2 border-dashed border-line px-6 py-8 text-muted">
          <h3 className="text-lg text-ink">{app.name} opens here</h3>
          <p className="max-w-[52ch]">
            In the live system this screen is the real {app.name}. The team connects it to the central sign-in, and
            it checks your access before showing any data.
          </p>
        </div>
        <SessionPanel />
      </div>
    </>
  );
}
