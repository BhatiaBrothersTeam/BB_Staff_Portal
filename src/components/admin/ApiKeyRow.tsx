"use client";

import { useActionState, useState } from "react";
import { issueKeyAction, revokeKeyAction, type KeyActionState } from "@/app/(protected)/dashboard/api-keys/actions";
import { RelativeTime } from "./RelativeTime";

const initialState: KeyActionState = { apiKey: null, error: null };

export interface ApiKeyRowData {
  code: string;
  name: string;
  key: {
    keyPrefix: string;
    createdBy: string;
    createdAt: string;
    lastUsedAt: string | null;
    revoked: boolean;
  } | null;
}

const smallButtonClassName =
  "rounded-[4px] border border-line px-3 py-1.5 text-[13px] hover:border-accent disabled:cursor-not-allowed disabled:opacity-60";

export function ApiKeyRow({ app, now }: { app: ApiKeyRowData; now: number }) {
  const [issueState, issueAction, isIssuing] = useActionState(issueKeyAction, initialState);
  const [revokeState, revokeAction, isRevoking] = useActionState(revokeKeyAction, initialState);
  const [copied, setCopied] = useState(false);

  const active = app.key !== null && !app.key.revoked;
  const error = issueState.error ?? revokeState.error;
  // A revoke after issuing hides the just-issued key: it no longer works.
  const newKey = active ? issueState.apiKey : null;

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li className="grid gap-3 border-b border-line px-[18px] py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded-[3px] bg-accent-soft px-1.5 py-0.5 font-mono-brand text-[11.5px]">{app.code}</span>
          <div className="min-w-0">
            <div className="font-semibold">{app.name}</div>
            <div className="text-[12.5px] text-muted">
              {app.key === null ? (
                "No key yet"
              ) : app.key.revoked ? (
                <>
                  Revoked · was <span className="font-mono-brand">{app.key.keyPrefix}…</span>
                </>
              ) : (
                <>
                  <span className="font-mono-brand">{app.key.keyPrefix}…</span> · created by {app.key.createdBy}{" "}
                  <RelativeTime iso={app.key.createdAt} now={now} /> · last used{" "}
                  {app.key.lastUsedAt ? <RelativeTime iso={app.key.lastUsedAt} now={now} /> : "never"}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <form
            action={issueAction}
            onSubmit={(event) => {
              if (active && !window.confirm(`Replace the ${app.name} key? The current key stops working straight away.`)) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="app" value={app.code} />
            <button type="submit" disabled={isIssuing || isRevoking} className={smallButtonClassName}>
              {isIssuing ? "Generating…" : active ? "Rotate key" : "Generate key"}
            </button>
          </form>
          {active ? (
            <form
              action={revokeAction}
              onSubmit={(event) => {
                if (!window.confirm(`Revoke the ${app.name} key? It will stop logging until it gets a new key.`)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="app" value={app.code} />
              <button type="submit" disabled={isIssuing || isRevoking} className={`${smallButtonClassName} text-err`}>
                {isRevoking ? "Revoking…" : "Revoke"}
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-sm bg-err-soft px-3 py-2.5 text-sm text-err">
          {error}
        </div>
      ) : null}

      {newKey ? (
        <div className="grid gap-2 rounded-sm border border-dashed border-accent bg-bg p-3">
          <p className="text-[13px]">
            <strong>Copy this key now — it won&apos;t be shown again.</strong> Put it in the {app.name}&apos;s{" "}
            <code className="font-mono-brand text-[12px]">.env.local</code> as{" "}
            <code className="font-mono-brand text-[12px]">ACTIVITY_LOG_API_KEY</code>.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-[3px] bg-surface px-2 py-1.5 font-mono-brand text-[12.5px]">
              {newKey}
            </code>
            <button type="button" onClick={() => copyKey(newKey)} className={smallButtonClassName}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
