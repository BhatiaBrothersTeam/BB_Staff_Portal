import type { ReactNode } from "react";
import { TopBar } from "@/components/TopBar";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <TopBar />
      <main className="mx-auto grid max-w-[1120px] gap-7 px-4 py-8 pb-14 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
