import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { ApiClient } from "@/generated/prisma/client";
import { getDb } from "./db";

// --- Activity-log API keys -------------------------------------------------
//
// Each app/agent that reports to POST /api/activity gets one key, sent in the
// `x-api-key` header. The database keeps only a SHA-256 hash of it: the keys
// are 32 random bytes, so a fast hash is enough (slow password hashes like
// bcrypt are for low-entropy human passwords), and it lets us look a key up
// by its hash directly. Someone who reads the api_clients table still can't
// recover a working key.

const KEY_PREFIX = "bbp_";
/** How much of the key is stored in clear, so admins can tell keys apart. */
const VISIBLE_PREFIX_LENGTH = 12;
/** Don't write last_used_at more often than this per key. */
const LAST_USED_RESOLUTION_MS = 60_000;

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}

function generateApiKey(): string {
  return KEY_PREFIX + randomBytes(32).toString("base64url");
}

/**
 * Creates the app's key, or replaces it (the old key stops working at once).
 * Returns the plaintext key — the only time it is ever available.
 */
export async function issueApiKey(app: { code: string; name: string }, createdBy: string): Promise<string> {
  const apiKey = generateApiKey();
  const data = {
    name: app.name,
    apiKeyHash: hashApiKey(apiKey),
    keyPrefix: apiKey.slice(0, VISIBLE_PREFIX_LENGTH),
    createdBy,
    createdAt: new Date(),
    lastUsedAt: null,
    revokedAt: null,
  };
  await getDb().apiClient.upsert({
    where: { appId: app.code },
    create: { appId: app.code, ...data },
    update: data,
  });
  return apiKey;
}

export async function revokeApiKey(appId: string): Promise<void> {
  await getDb().apiClient.updateMany({ where: { appId, revokedAt: null }, data: { revokedAt: new Date() } });
}

/** The active ApiClient a presented key belongs to, or null. */
export async function findApiClientByKey(apiKey: string | null | undefined): Promise<ApiClient | null> {
  if (!apiKey || !apiKey.startsWith(KEY_PREFIX)) return null;
  const client = await getDb().apiClient.findUnique({ where: { apiKeyHash: hashApiKey(apiKey) } });
  if (!client || client.revokedAt) return null;
  return client;
}

export async function touchApiClient(client: ApiClient): Promise<void> {
  const now = Date.now();
  if (client.lastUsedAt && now - client.lastUsedAt.getTime() < LAST_USED_RESOLUTION_MS) return;
  await getDb().apiClient.update({ where: { id: client.id }, data: { lastUsedAt: new Date(now) } });
}
