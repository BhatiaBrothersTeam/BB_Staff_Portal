import type { Metadata } from "next";
import { DashboardView } from "@/components/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard · Bhatia Brothers Staff Portal",
};

export default function DashboardPage() {
  return <DashboardView />;
}
