import type { Metadata } from "next";
import { DashboardView } from "@/components/DashboardView";
import { isAdmin } from "@/lib/admin";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard · Bhatia Brothers Staff Portal",
};

export default async function DashboardPage() {
  return <DashboardView isAdmin={isAdmin(await getSession())} />;
}
