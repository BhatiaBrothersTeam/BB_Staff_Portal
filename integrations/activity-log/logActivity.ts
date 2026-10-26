// =============================================================================
// logActivity — report a user action to the Bhatia Brothers Staff Portal's
// central activity log (POST /api/activity).
//
// COPY THIS FILE AS-IS into any agent's server code (e.g. lib/logActivity.ts).
// Nothing in it is app-specific; each app only needs its own two env vars in
// its own .env.local:
//
//   STAFF_PORTAL_URL=https://staff.bhatiabrothers.com   # the portal's base URL
//   ACTIVITY_LOG_API_KEY=bbp_...                        # this app's key
//
// Get ACTIVITY_LOG_API_KEY from the portal at /dashboard/api-keys (admins
// only). It is NOT the JWT_SECRET used for the SSO handoff — keep them
// separate, and give every app its own key. The portal works out which app
// sent the entry from the key, so never send an appId.
//
// SERVER-SIDE ONLY. Call it from route handlers / API endpoints / server
// actions, never from browser code: a key in a browser bundle can be copied
// by anyone and used to write fake entries. (A Vite `VITE_*` variable or a
// Next.js `NEXT_PUBLIC_*` variable ends up in the browser — don't use those.)
//
// Fire-and-forget: logActivity() returns immediately and never throws. If the
// portal is slow, down or rejects the entry, the user's action still succeeds
// and the problem is only written to this app's console.
//
// Needs Node 18+ (global fetch). In Next.js on serverless hosting, wrap the
// call in `after(() => logActivity(...))` from "next/server" so the request
// isn't cut off when the response finishes.
// =============================================================================

export interface ActivityEvent {
  /** The signed-in user's SSO id — the `sub` from the portal's handoff token. */
  userId: string;
  /** Dotted "<entity>.<verb>" name, e.g. "lead.created", "lead.status_changed". */
  action: string;
  /** What was acted on, e.g. "lead". */
  entityType?: string;
  /** Its id in this app's database. */
  entityId?: string | number;
  /** Any extra detail worth keeping, e.g. { from: "new", to: "qualified" }. Max 16 KB. */
  metadata?: Record<string, unknown>;
  /** The end user's IP and browser, from the incoming request (optional). */
  ipAddress?: string;
  userAgent?: string;
}

const TIMEOUT_MS = 5000;
let warnedMissingConfig = false;

export function logActivity(event: ActivityEvent): void {
  const baseUrl = process.env.STAFF_PORTAL_URL;
  const apiKey = process.env.ACTIVITY_LOG_API_KEY;
  if (!baseUrl || !apiKey) {
    if (!warnedMissingConfig) {
      console.warn("[logActivity] STAFF_PORTAL_URL or ACTIVITY_LOG_API_KEY is not set — activity is not being logged.");
      warnedMissingConfig = true;
    }
    return;
  }

  void fetch(`${baseUrl.replace(/\/$/, "")}/api/activity`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
    .then(async (res) => {
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error(`[logActivity] ${event.action} was rejected (${res.status}): ${detail}`);
      }
    })
    .catch((err: unknown) => {
      console.error(`[logActivity] ${event.action} could not be sent:`, err);
    });
}
