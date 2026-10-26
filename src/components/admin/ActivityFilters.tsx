"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";

export interface ActivityFilterValues {
  user: string;
  app: string;
  action: string;
  from: string;
  to: string;
}

const labelClassName = "text-xs font-semibold uppercase tracking-wider text-muted";
const fieldClassName =
  "w-full rounded-[4px] border border-line bg-bg px-3 py-2 text-[14px] focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft";

export function ActivityFilters({
  values,
  apps,
  actions,
}: {
  values: ActivityFilterValues;
  apps: { code: string; name: string }[];
  actions: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    // The date pickers give calendar days; send this browser's UTC offset so
    // the server can turn "26 Oct" into the right instant for this user.
    if (params.has("from") || params.has("to")) {
      params.set("tz", String(new Date().getTimezoneOffset()));
    }
    const query = params.toString();
    startTransition(() => router.push(query ? `/dashboard/activity?${query}` : "/dashboard/activity"));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-sm border border-line bg-surface p-[18px] sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_0.9fr_0.9fr_auto] lg:items-end"
    >
      <div className="grid gap-1.5">
        <label htmlFor="filter-user" className={labelClassName}>
          User
        </label>
        <input
          id="filter-user"
          name="user"
          defaultValue={values.user}
          placeholder="User id contains…"
          className={fieldClassName}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="filter-app" className={labelClassName}>
          App
        </label>
        <select id="filter-app" name="app" defaultValue={values.app} className={fieldClassName}>
          <option value="">All apps</option>
          {apps.map((app) => (
            <option key={app.code} value={app.code}>
              {app.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="filter-action" className={labelClassName}>
          Action
        </label>
        <select id="filter-action" name="action" defaultValue={values.action} className={fieldClassName}>
          <option value="">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="filter-from" className={labelClassName}>
          From
        </label>
        <input id="filter-from" name="from" type="date" defaultValue={values.from} className={fieldClassName} />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="filter-to" className={labelClassName}>
          To
        </label>
        <input id="filter-to" name="to" type="date" defaultValue={values.to} className={fieldClassName} />
      </div>

      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[4px] bg-btn-bg px-4 py-2 font-display text-[14px] font-bold tracking-wide text-btn-ink transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Filtering…" : "Filter"}
        </button>
        <Link href="/dashboard/activity" className="text-[13px] text-muted hover:text-ink">
          Clear
        </Link>
      </div>
    </form>
  );
}
