"use client";

import { useEffect, useState } from "react";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

function formatRelative(ts: number, now: number): string {
  const seconds = Math.round((ts - now) / 1000);
  if (Math.abs(seconds) < 45) return "just now";
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(Math.round(seconds / 60), "minute");
}

/**
 * "5 minutes ago", kept current while the page is open. The first render uses
 * the server's `now` so server and client HTML match; the exact local time is
 * filled into the tooltip once on the client.
 */
export function RelativeTime({ iso, now }: { iso: string; now: number }) {
  const [current, setCurrent] = useState(now);
  const [exact, setExact] = useState<string | undefined>(undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client clock and locale only exist after hydration
    setCurrent(Date.now());
    setExact(new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" }));
    const timer = setInterval(() => setCurrent(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [iso]);

  return (
    <time dateTime={iso} title={exact} className="whitespace-nowrap">
      {formatRelative(Date.parse(iso), current)}
    </time>
  );
}
