import type { AppConfig, AppGroup } from "./types";

// Single source of truth for every app/agent tile. Add a new entry here and
// it appears on the dashboard, in the login brand panel, and at /app/[code].
export const APPS: AppConfig[] = [
  { code: "TSK", name: "Task App", group: "apps", description: "Assign, follow up and close team tasks." },
  { code: "HR", name: "HR Employee App", group: "apps", description: "Leave requests, documents and staff records." },
  { code: "CPR", name: "CPR Format", group: "apps", description: "Prepare CPR documents in the company format." },
  { code: "PO", name: "PO Format", group: "apps", description: "Raise purchase orders in the approved format." },
  { code: "LPR", name: "LPR Format", group: "apps", description: "Prepare LPR documents in the company format." },
  {
    code: "LGA",
    name: "Lead Gen Agent",
    group: "agents",
    description: "Find, qualify and track new sales leads.",
    ssoEnabled: true,
  },
  {
    code: "JCA",
    name: "Job Card Agent",
    group: "agents",
    description: "Open, update and close workshop job cards.",
    ssoEnabled: true,
  },
  { code: "BID", name: "Bids Agent", group: "agents", description: "Track tenders and prepare bid submissions." },
  { code: "CRM", name: "CRM Agent", group: "agents", description: "Customer contacts, follow-ups and pipeline." },
  { code: "C&E", name: "C&E Agent", group: "agents", description: "Opens the C&E agent." },
  { code: "PQ", name: "PQ Agent", group: "agents", description: "Opens the PQ agent." },
];

export const GROUP_LABELS: Record<AppGroup, string> = {
  apps: "Apps and formats",
  agents: "Agents",
};

export const GROUP_ORDER: AppGroup[] = ["apps", "agents"];

export function getAppsByGroup(group: AppGroup): AppConfig[] {
  return APPS.filter((app) => app.group === group);
}

export function getAppByCode(code: string): AppConfig | undefined {
  const normalized = code.toUpperCase();
  return APPS.find((app) => app.code.toUpperCase() === normalized);
}
