"use client";

import { motion, useReducedMotion } from "framer-motion";

export function HandoffOverlay({ appName }: { appName: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-20 grid place-items-center bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-4"
      role="status"
      aria-live="polite"
    >
      <div className="grid w-full max-w-[360px] gap-2.5 rounded-sm border border-line bg-surface p-6">
        <strong className="font-display text-base">Opening {appName}</strong>
        <span className="text-[13.5px] text-muted">Checking your portal sign-in…</span>
        <div className="h-1 overflow-hidden rounded-full bg-line">
          {reduceMotion ? (
            <span className="block h-full w-full bg-accent" />
          ) : (
            <motion.span
              className="block h-full w-[40%] bg-accent"
              animate={{ x: ["-100%", "250%"] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
