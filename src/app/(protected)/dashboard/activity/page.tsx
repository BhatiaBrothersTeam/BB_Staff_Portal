import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { ActivityFilters, type ActivityFilterValues } from "@/components/admin/ActivityFilters";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RelativeTime } from "@/components/admin/RelativeTime";
import { describeAction } from "@/lib/activity";
import { requireAdmin } from "@/lib/admin";
import { APPS, getAppByCode } from "@/lib/apps";
import { getDb } from "@/lib/db";

export const metadata: Metadata = {
  title: "Activity log · Bhatia Brothers Staff Portal",
};

const PAGE_SIZE = 50;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/**
 * Start of a calendar day in the viewer's time zone, as a Date. `tzOffset` is
 * the browser's getTimezoneOffset() (minutes, e.g. -330 for IST).
 */
function startOfDay(date: string, tzOffset: number, addDays = 0): Date | undefined {
  const match = DATE_PATTERN.exec(date);
  if (!match) return undefined;
  const [, y, m, d] = match.map(Number);
  return new Date(Date.UTC(y, m - 1, d + addDays) + tzOffset * 60_000);
}

function appName(appId: string): string {
  return getAppByCode(appId)?.name ?? appId;
}

function pageHref(searchParams: SearchParams, page: number): string {
  const params = new URLSearchParams();
  for (const key of ["user", "app", "action", "from", "to", "tz"]) {
    const value = first(searchParams[key]);
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/dashboard/activity?${query}` : "/dashboard/activity";
}

/** One page of entries plus the filter options, or null if the database can't be reached. */
async function loadActivity(where: Prisma.ActivityLogWhereInput, page: number) {
  try {
    const db = getDb();
    const [total, rows, actionGroups, appGroups] = await Promise.all([
      db.activityLog.count({ where }),
      db.activityLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.activityLog.groupBy({ by: ["action"], orderBy: { action: "asc" } }),
      db.activityLog.groupBy({ by: ["appId"] }),
    ]);
    return {
      total,
      rows,
      actions: actionGroups.map((g) => g.action),
      loggedApps: appGroups.map((g) => g.appId),
      loadedAt: Date.now(),
    };
  } catch (err) {
    console.error("[activity] could not load the activity log", err);
    return null;
  }
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;

  const filters: ActivityFilterValues = {
    user: first(params.user),
    app: first(params.app),
    action: first(params.action),
    from: DATE_PATTERN.test(first(params.from)) ? first(params.from) : "",
    to: DATE_PATTERN.test(first(params.to)) ? first(params.to) : "",
  };
  const tzOffset = Number.parseInt(first(params.tz), 10);
  const offset = Number.isFinite(tzOffset) && Math.abs(tzOffset) <= 14 * 60 ? tzOffset : 0;
  const page = Math.max(1, Number.parseInt(first(params.page), 10) || 1);

  const from = startOfDay(filters.from, offset);
  const to = startOfDay(filters.to, offset, 1); // the whole "to" day is included
  const where: Prisma.ActivityLogWhereInput = {
    userId: filters.user ? { contains: filters.user, mode: "insensitive" } : undefined,
    appId: filters.app || undefined,
    action: filters.action || undefined,
    createdAt: from || to ? { gte: from, lt: to } : undefined,
  };

  const data = await loadActivity(where, page);

  // Every registered app, plus any app code that has logged but has since
  // been removed from src/lib/apps.ts.
  const appOptions = [
    ...APPS.map((app) => ({ code: app.code, name: app.name })),
    ...(data?.loggedApps ?? [])
      .filter((code) => !getAppByCode(code))
      .map((code) => ({ code, name: code })),
  ];
  const now = data?.loadedAt ?? 0;

  return (
    <>
      <AdminHeader
        current="/dashboard/activity"
        title="Activity log"
        description="What staff have done across the portal's apps and agents, newest first."
      />

      {/* Re-mount on navigation so "Clear" and pagination reset the inputs. */}
      <ActivityFilters key={JSON.stringify(filters)} values={filters} apps={appOptions} actions={data?.actions ?? []} />

      {data === null ? (
        <div role="alert" className="rounded-sm bg-err-soft px-4 py-3 text-sm text-err">
          Couldn&apos;t load the activity log. Check that DATABASE_URL is set and the database tables exist (see
          prisma/README.md).
        </div>
      ) : (
        <section aria-label="Activity entries" className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-muted">
            <span>
              {data.total === 0
                ? "No entries"
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + data.rows.length} of ${data.total.toLocaleString("en-GB")}`}
            </span>
          </div>

          <div className="overflow-x-auto rounded-sm border border-line bg-surface">
            <table className="w-full min-w-[760px] border-collapse text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    When
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Summary
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    App
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted">
                      Nothing matches these filters yet.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row) => (
                    <tr key={row.id} className="border-b border-line align-top last:border-b-0">
                      <td className="px-4 py-3 text-muted">
                        <RelativeTime iso={row.createdAt.toISOString()} now={now} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{row.userId}</span>{" "}
                        <span className="text-muted">·</span> {describeAction(row.action)}
                        {row.entityType || row.entityId ? (
                          <>
                            {" "}
                            <span className="text-muted">·</span>{" "}
                            <span className="font-mono-brand text-[12.5px]">
                              {[row.entityType, row.entityId && `#${row.entityId}`].filter(Boolean).join(" ")}
                            </span>
                          </>
                        ) : null}
                        <div className="mt-0.5 font-mono-brand text-[11.5px] text-muted">{row.action}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="mr-2 rounded-[3px] bg-accent-soft px-1.5 py-0.5 font-mono-brand text-[11.5px]">
                          {row.appId}
                        </span>
                        {appName(row.appId)}
                      </td>
                      <td className="px-4 py-3">
                        <details>
                          <summary className="cursor-pointer text-[13px] text-muted hover:text-ink">View</summary>
                          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
                            <dt className="text-muted">IP</dt>
                            <dd className="font-mono-brand">{row.ipAddress ?? "—"}</dd>
                            <dt className="text-muted">Browser</dt>
                            <dd className="max-w-[260px] break-words">{row.userAgent ?? "—"}</dd>
                          </dl>
                          {row.metadata !== null ? (
                            <pre className="mt-2 max-h-56 max-w-[320px] overflow-auto rounded-[3px] bg-bg p-2 font-mono-brand text-[11.5px]">
                              {JSON.stringify(row.metadata, null, 2)}
                            </pre>
                          ) : null}
                        </details>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data.total > PAGE_SIZE ? (
            <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-[13px]">
              {page > 1 ? (
                <Link href={pageHref(params, page - 1)} className="rounded-[4px] border border-line px-3 py-1.5 hover:border-accent">
                  ← Newer
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                Page {page} of {Math.ceil(data.total / PAGE_SIZE)}
              </span>
              {page * PAGE_SIZE < data.total ? (
                <Link href={pageHref(params, page + 1)} className="rounded-[4px] border border-line px-3 py-1.5 hover:border-accent">
                  Older →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>
      )}
    </>
  );
}
