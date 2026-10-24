"use client";

import { useSession } from "./SessionProvider";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function SessionPanel() {
  const { session } = useSession();

  return (
    <aside className="grid content-start gap-3 rounded-sm border border-line bg-surface p-[18px]">
      <h3 className="text-[15px] font-bold">Your session</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-[13.5px]">
        <dt className="text-muted">User</dt>
        <dd className="tabular-nums">{session?.user ?? "—"}</dd>
        <dt className="text-muted">Signed in</dt>
        <dd className="tabular-nums">{session ? formatTime(session.since) : "—"}</dd>
        <dt className="text-muted">Access</dt>
        <dd>{session && session.groups.length > 0 ? session.groups.join(", ") : "No groups"}</dd>
      </dl>
      <div>
        <div className="mb-1.5 text-[13px] text-muted">Opened this session</div>
        <div className="flex flex-wrap gap-1.5">
          {session && session.opened.length > 0 ? (
            session.opened.map((code) => (
              <span key={code} className="rounded-[3px] bg-accent-soft px-2 py-0.5 font-mono-brand text-[11.5px]">
                {code}
              </span>
            ))
          ) : (
            <span className="text-[13px] text-muted">None yet</span>
          )}
        </div>
      </div>
    </aside>
  );
}
