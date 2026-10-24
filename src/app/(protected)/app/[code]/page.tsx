import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAppByCode } from "@/lib/apps";
import { AppView } from "@/components/AppView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const app = getAppByCode(decodeURIComponent(code));
  return { title: app ? `${app.name} · Bhatia Brothers Staff Portal` : "Bhatia Brothers Staff Portal" };
}

export default async function AppPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const app = getAppByCode(decodeURIComponent(code));

  if (!app) {
    notFound();
  }

  return <AppView app={app} />;
}
