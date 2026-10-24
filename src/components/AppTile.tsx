"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import type { AppConfig } from "@/lib/types";
import { HandoffOverlay } from "./HandoffOverlay";
import { useSession } from "./SessionProvider";

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

function TileBody({ app, opened }: { app: AppConfig; opened: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-sm border border-line bg-accent-soft px-2 py-0.5 font-mono-brand text-xs tracking-wide text-ink">
          {app.code}
        </span>
        {opened ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <span className="h-[7px] w-[7px] rounded-full bg-ink" aria-hidden="true" />
            Opened
          </span>
        ) : null}
      </div>
      <div>
        <h3 className="mb-1 text-[17px] font-bold">{app.name}</h3>
        <p className="text-[13.5px] text-muted">{app.description}</p>
      </div>
      <div className="flex items-center justify-between border-t border-line pt-2.5 font-display text-[13.5px] font-bold">
        <span>Open</span>
        <span aria-hidden="true" className="text-accent transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </div>
    </>
  );
}

const tileClassName =
  "group grid h-full w-full grid-rows-[auto_1fr_auto] gap-3 rounded-sm border border-line bg-surface p-[18px] text-left transition-colors hover:border-accent";

export function AppTile({ app }: { app: AppConfig }) {
  const { hasOpened } = useSession();
  const reduceMotion = useReducedMotion();
  const opened = hasOpened(app.code);

  return (
    <motion.div
      variants={tileVariants}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {app.ssoEnabled ? (
        <SsoAppTile app={app} opened={opened} />
      ) : (
        <Link href={`/app/${encodeURIComponent(app.code)}`} className={tileClassName}>
          <TileBody app={app} opened={opened} />
        </Link>
      )}
    </motion.div>
  );
}

// SSO-enabled apps are real, separate deployments: clicking the tile hands
// the browser off to that app (see src/lib/sso.ts), so this can't be a
// plain internal <Link>. We show the same handoff overlay used by the
// placeholder apps, then navigate away with window.location once it's run.
function SsoAppTile({ app, opened }: { app: AppConfig; opened: boolean }) {
  const { markOpened } = useSession();
  const reduceMotion = useReducedMotion();
  const [launching, setLaunching] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- enables a document.body portal target once on the client
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!launching) return;
    const timer = setTimeout(
      () => {
        markOpened(app.code);
        // A real top-level navigation (not router.push) so the browser follows
        // this route's redirect chain all the way to the agent app's own origin.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `/api/sso/${encodeURIComponent(app.code)}`;
      },
      reduceMotion ? 150 : 900,
    );
    return () => clearTimeout(timer);
  }, [launching, app.code, markOpened, reduceMotion]);

  return (
    <>
      <button type="button" onClick={() => setLaunching(true)} className={tileClassName}>
        <TileBody app={app} opened={opened} />
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>{launching ? <HandoffOverlay appName={app.name} /> : null}</AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
