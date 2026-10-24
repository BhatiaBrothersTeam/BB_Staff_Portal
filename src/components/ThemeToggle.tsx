"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle({
  className = "",
  variant = "surface",
}: {
  className?: string;
  variant?: "surface" | "ghost";
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration guard
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className={`inline-block h-8 w-8 ${className}`} aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";
  const base =
    variant === "ghost"
      ? "border-[color-mix(in_srgb,var(--navy-ink)_35%,transparent)] bg-transparent text-navy-ink hover:border-silver hover:text-silver-hi"
      : "border-line bg-surface text-ink hover:border-accent";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`grid h-8 w-8 place-items-center rounded-sm border transition-colors ${base} ${className}`}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M20.742 13.045a8.5 8.5 0 1 1-9.787-9.787 7 7 0 1 0 9.787 9.787Z" />
        </svg>
      )}
    </button>
  );
}
