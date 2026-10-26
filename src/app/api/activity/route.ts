import { after, NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { MAX_ACTIVITY_BODY_BYTES, parseActivityPayload } from "@/lib/activity";
import { findApiClientByKey, touchApiClient } from "@/lib/apiKeys";
import { getDb } from "@/lib/db";

// Central activity log. Apps and agents report what their users do here,
// server to server:
//
//   POST /api/activity
//   x-api-key: <that app's key, from /dashboard/api-keys>
//   { "userId": "...", "action": "lead.created", "entityType": "lead",
//     "entityId": "123", "metadata": { ... } }
//
// 201 { id } on success, 401 for a missing/invalid/revoked key, 400 for a bad
// payload. There's deliberately no CORS: the key must stay on the agent's
// server, never in a browser bundle. See integrations/activity-log/.

function requestIp(request: NextRequest): string | undefined {
  // Behind Azure/App Service the client address arrives in X-Forwarded-For.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("x-real-ip") || undefined)?.slice(0, 64);
}

function error(status: number, message: string, details?: string[]) {
  return NextResponse.json(details ? { error: message, details } : { error: message }, { status });
}

export async function POST(request: NextRequest) {
  let client;
  try {
    client = await findApiClientByKey(request.headers.get("x-api-key"));
  } catch (err) {
    console.error("[activity] API key lookup failed", err);
    return error(503, "Activity log is unavailable.");
  }
  if (!client) {
    return error(401, "Missing or invalid API key.");
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  const raw = declaredLength > MAX_ACTIVITY_BODY_BYTES ? null : await request.text();
  if (raw === null || Buffer.byteLength(raw) > MAX_ACTIVITY_BODY_BYTES) {
    return error(400, `Body must be at most ${MAX_ACTIVITY_BODY_BYTES / 1024} KB.`);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error(400, "Body must be valid JSON.");
  }

  const parsed = parseActivityPayload(body);
  if (!parsed.ok) {
    return error(400, "Invalid activity payload.", parsed.errors);
  }
  const { metadata, ipAddress, userAgent, ...entry } = parsed.data;

  try {
    const row = await getDb().activityLog.create({
      data: {
        ...entry,
        appId: client.appId,
        metadata: metadata as Prisma.InputJsonObject | undefined,
        ipAddress: ipAddress ?? requestIp(request),
        userAgent: userAgent ?? request.headers.get("user-agent")?.slice(0, 512),
      },
      select: { id: true },
    });

    // Bookkeeping only — run it after the response is sent.
    after(() => touchApiClient(client).catch((err) => console.error("[activity] lastUsedAt update failed", err)));

    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (err) {
    console.error("[activity] insert failed", err);
    return error(500, "Could not save the activity entry.");
  }
}
