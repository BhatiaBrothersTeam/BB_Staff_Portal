import { APPS } from "@/lib/apps";
import { BrandMark } from "./BrandMark";

export function BrandPanel() {
  return (
    <div className="brand-sheen relative flex flex-col justify-between gap-8 overflow-hidden bg-navy px-6 py-10 text-navy-ink sm:px-8 sm:py-12 md:gap-10">
      <BrandMark />

      <div>
        <h1 className="max-w-[14ch] font-display text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.05] tracking-tight text-balance">
          One sign-in for every staff app.
        </h1>
        <p className="mt-3.5 max-w-[42ch] opacity-80">
          Sign in once here. Every app and agent below opens without asking for your password again.
        </p>
      </div>

      <ul className="hidden grid-cols-2 gap-x-6 gap-y-1.5 text-[13.5px] md:grid">
        {APPS.map((app) => (
          <li key={app.code} className="flex items-baseline gap-2.5">
            <code className="min-w-[3.4em] font-mono-brand text-[11.5px] text-silver">{app.code}</code>
            <span>{app.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
