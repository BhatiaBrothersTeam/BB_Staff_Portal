import Link from "next/link";

const LINKS = [
  { href: "/dashboard/activity", label: "Activity log" },
  { href: "/dashboard/api-keys", label: "API keys" },
] as const;

export function AdminHeader({
  current,
  title,
  description,
}: {
  current: (typeof LINKS)[number]["href"];
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-4">
      <nav aria-label="Admin" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        <Link href="/dashboard" className="text-muted hover:text-ink">
          ← Dashboard
        </Link>
        <span className="h-4 w-px bg-line" aria-hidden="true" />
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.href === current ? "page" : undefined}
            className={
              link.href === current
                ? "font-semibold text-ink underline decoration-silver underline-offset-4"
                : "text-muted hover:text-ink"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div>
        <h2 className="font-display text-[clamp(24px,3vw,32px)] font-extrabold">{title}</h2>
        <p className="mt-1 text-muted">{description}</p>
      </div>
    </div>
  );
}
