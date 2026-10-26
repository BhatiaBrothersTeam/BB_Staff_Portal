// Shape and limits of one activity-log entry, as POSTed to /api/activity by
// an app or agent. `appId` is deliberately absent: the route takes it from
// the caller's API key, so one app can't log as another.

export interface ActivityInput {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  /** The end user's IP/user agent, forwarded by the agent's backend. */
  ipAddress?: string;
  userAgent?: string;
}

export type ActivityParseResult = { ok: true; data: ActivityInput } | { ok: false; errors: string[] };

export const MAX_ACTIVITY_BODY_BYTES = 32 * 1024;
const MAX_METADATA_BYTES = 16 * 1024;
// "lead.created", "lead.status_changed", "job_card:closed" ...
const ACTION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(
  body: Record<string, unknown>,
  key: string,
  maxLength: number,
  errors: string[],
): string | undefined {
  const value = body[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    errors.push(`${key} must be a string.`);
    return undefined;
  }
  if (value.length > maxLength) {
    errors.push(`${key} must be at most ${maxLength} characters.`);
    return undefined;
  }
  return value;
}

export function parseActivityPayload(body: unknown): ActivityParseResult {
  if (!isPlainObject(body)) {
    return { ok: false, errors: ["Body must be a JSON object."] };
  }

  const errors: string[] = [];

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) errors.push("userId is required.");
  else if (userId.length > 200) errors.push("userId must be at most 200 characters.");

  const action = typeof body.action === "string" ? body.action.trim() : "";
  if (!action) errors.push("action is required.");
  else if (action.length > 100 || !ACTION_PATTERN.test(action)) {
    errors.push('action must be up to 100 letters, digits, ".", "_", ":" or "-" (e.g. "lead.created").');
  }

  const entityType = optionalString(body, "entityType", 100, errors);

  // Accept numeric ids too, since many agents use integer primary keys.
  let entityId: string | undefined;
  if (typeof body.entityId === "number" && Number.isFinite(body.entityId)) {
    entityId = String(body.entityId);
  } else {
    entityId = optionalString(body, "entityId", 200, errors);
  }

  let metadata: Record<string, unknown> | undefined;
  if (body.metadata !== undefined && body.metadata !== null) {
    if (!isPlainObject(body.metadata)) {
      errors.push("metadata must be a JSON object.");
    } else if (JSON.stringify(body.metadata).length > MAX_METADATA_BYTES) {
      errors.push(`metadata must be at most ${MAX_METADATA_BYTES / 1024} KB.`);
    } else {
      metadata = body.metadata;
    }
  }

  const ipAddress = optionalString(body, "ipAddress", 64, errors);
  const userAgent = optionalString(body, "userAgent", 512, errors);

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: { userId, action, entityType, entityId, metadata, ipAddress, userAgent } };
}

/** "lead.status_changed" → "Lead status changed" */
export function describeAction(action: string): string {
  const words = action.replace(/[._:-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
