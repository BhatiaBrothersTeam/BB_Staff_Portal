# Activity log: connecting an app or agent

The portal keeps one central activity log. Each app or agent reports what its users do by calling
`POST /api/activity` on the portal, from its **own server**, with its **own API key**. Admins read the log at
`/dashboard/activity`.

This folder holds a ready-made helper for each kind of backend. Copy one file into the agent, unchanged:

| Agent backend | Copy | To (suggested) |
|---|---|---|
| Node / Next.js / Express (TypeScript) | `logActivity.ts` | `lib/logActivity.ts` |
| Python / FastAPI (e.g. Lead Gen Agent) | `log_activity.py` | `backend/api/activity.py` |

## Connect a new app: four steps

1. **Register the app.** It needs an entry in the portal's `src/lib/apps.ts`, which is already true for every tile.
2. **Generate its key.** Sign in to the portal as an admin, open **API keys** (`/dashboard/api-keys`), and click
   **Generate key** next to the app. Copy the key straight away, because the portal keeps only a hash and won't
   show it again.
3. **Add two env vars to that app's `.env.local`** (server-side, not `VITE_*` / `NEXT_PUBLIC_*`):

   ```env
   STAFF_PORTAL_URL=http://localhost:3000
   ACTIVITY_LOG_API_KEY=bbp_...
   ```

   This key is separate from `JWT_SECRET` (the SSO handoff secret). Every app gets a different key.
4. **Call the helper** after each meaningful action succeeds (below).

## What to log

Use `<entity>.<verb>` names. For the Lead Gen Agent:

| Action | When | Useful metadata |
|---|---|---|
| `lead.created` | A lead is saved for the first time | `{ company, source }` |
| `lead.updated` | Lead fields change | `{ fields: ["phone", "email"] }` (names only, not values) |
| `lead.status_changed` | Status moves, e.g. new → qualified | `{ from, to }` |
| `lead.assigned` | Lead is given to a salesperson | `{ from, to }` (assignee ids) |
| `lead.deleted` | Lead is removed | `{ company }` |

Other agents follow the same pattern: `job_card.opened`, `job_card.closed`, `bid.submitted`, `contact.created`, and so on.

`userId` is the signed-in user's SSO id. That's the `sub` claim of the handoff token the portal sends to
`/auth/sso`, which the agent already stores in its own session when the SSO handoff completes.

Keep personal or sensitive data (phone numbers, emails, notes) out of `metadata`. Log *that* something changed,
not the new values.

## Example: Lead Gen Agent (FastAPI)

```python
from fastapi import APIRouter, Depends, Request
from .activity import log_activity          # the copied log_activity.py
from .auth import current_user              # whatever reads the agent's SSO session

router = APIRouter()

def request_context(request: Request) -> dict:
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }

@router.post("/leads")
def create_lead(body: LeadIn, request: Request, user=Depends(current_user)):
    lead = leads_repo.create(body)                       # existing logic, unchanged
    log_activity(user.sub, "lead.created", entity_type="lead", entity_id=lead.id,
                 metadata={"company": lead.company}, **request_context(request))
    return lead

@router.patch("/leads/{lead_id}/status")
def change_status(lead_id: int, body: StatusIn, request: Request, user=Depends(current_user)):
    lead = leads_repo.get(lead_id)
    old = lead.status
    lead = leads_repo.set_status(lead_id, body.status)    # existing logic, unchanged
    log_activity(user.sub, "lead.status_changed", entity_type="lead", entity_id=lead_id,
                 metadata={"from": old, "to": lead.status}, **request_context(request))
    return lead
```

## Example: a Node / Next.js agent

```ts
import { after } from "next/server";
import { logActivity } from "@/lib/logActivity";

export async function POST(request: Request) {
  const session = await getAgentSession();                  // the agent's SSO session
  const lead = await createLead(await request.json());      // existing logic, unchanged

  after(() =>
    logActivity({
      userId: session.sub,
      action: "lead.created",
      entityType: "lead",
      entityId: lead.id,
      metadata: { company: lead.company },
      userAgent: request.headers.get("user-agent") ?? undefined,
    }),
  );
  return Response.json(lead, { status: 201 });
}
```

## The endpoint

```http
POST /api/activity
x-api-key: bbp_...
content-type: application/json

{ "userId": "test.sales", "action": "lead.created", "entityType": "lead", "entityId": "123", "metadata": { "company": "Acme" } }
```

| Response | Meaning |
|---|---|
| `201 { "id": "..." }` | Saved |
| `400 { "error", "details": [...] }` | Bad payload. `userId` and `action` are required; `metadata` must be an object |
| `401` | Missing, wrong or revoked API key |

The portal sends no CORS headers, so browser calls fail on purpose. Call it from the agent's server.

Quick test from a terminal:

```bash
curl -i -X POST http://localhost:3000/api/activity -H "x-api-key: bbp_..." -H "content-type: application/json" -d "{\"userId\":\"test.sales\",\"action\":\"lead.created\",\"entityType\":\"lead\",\"entityId\":\"1\"}"
```
