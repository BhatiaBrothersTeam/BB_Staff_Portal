"use client";

import { motion, type Variants } from "framer-motion";
import { getAppsByGroup, GROUP_LABELS, GROUP_ORDER } from "@/lib/apps";
import { AppTile } from "./AppTile";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

export function AppGrid() {
  return (
    <div className="grid gap-7">
      {GROUP_ORDER.map((group) => {
        const apps = getAppsByGroup(group);
        return (
          <section key={group} aria-labelledby={`group-${group}`} className="grid gap-3">
            <div className="flex items-baseline gap-2.5 border-b border-line pb-2">
              <h3
                id={`group-${group}`}
                className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted"
              >
                {GROUP_LABELS[group]}
              </h3>
              <span className="font-mono-brand text-xs text-muted">{apps.length}</span>
            </div>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3.5"
            >
              {apps.map((app) => (
                <AppTile key={app.code} app={app} />
              ))}
            </motion.div>
          </section>
        );
      })}
    </div>
  );
}
