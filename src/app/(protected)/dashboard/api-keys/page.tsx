import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ApiKeyRow, type ApiKeyRowData } from "@/components/admin/ApiKeyRow";
import { requireAdmin } from "@/lib/admin";
import { APPS } from "@/lib/apps";
import { getDb } from "@/lib/db";

export const metadata: Metadata = {
  title: "API keys · Bhatia Brothers Staff Portal",
};

async function loadApiClients() {
  try {
    return { clients: await getDb().apiClient.findMany(), loadedAt: Date.now() };
  } catch (err) {
    console.error("[api-keys] could not load API clients", err);
    return { clients: null, loadedAt: 0 };
  }
}

export default async function ApiKeysPage() {
  await requireAdmin();

  const { clients, loadedAt: now } = await loadApiClients();

  const byApp = new Map((clients ?? []).map((client) => [client.appId, client]));
  const rows: ApiKeyRowData[] = APPS.map((app) => {
    const client = byApp.get(app.code);
    return {
      code: app.code,
      name: app.name,
      key: client
        ? {
            keyPrefix: client.keyPrefix,
            createdBy: client.createdBy,
            createdAt: client.createdAt.toISOString(),
            lastUsedAt: client.lastUsedAt?.toISOString() ?? null,
            revoked: client.revokedAt !== null,
          }
        : null,
    };
  });

  return (
    <>
      <AdminHeader
        current="/dashboard/api-keys"
        title="API keys"
        description="One key per app or agent, used to send entries to the activity log. Only a hash is stored, so a key is shown once, when it's generated."
      />

      {clients === null ? (
        <div role="alert" className="rounded-sm bg-err-soft px-4 py-3 text-sm text-err">
          Couldn&apos;t load the API keys. Check that DATABASE_URL is set and the database tables exist (see
          prisma/README.md).
        </div>
      ) : (
        <ul className="rounded-sm border border-line bg-surface">
          {rows.map((app) => (
            <ApiKeyRow key={app.code} app={app} now={now} />
          ))}
        </ul>
      )}
    </>
  );
}
