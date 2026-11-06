import Link from "next/link";
import type { ReactNode } from "react";

export interface Stat {
  label: string;
  value: number;
  href: string;
}

export function StatCards({ stats, children }: { stats: readonly Stat[]; children?: ReactNode }) {
  return (
    <section aria-label="Overview">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link
              href={stat.href}
              className="block rounded-lg border border-border bg-surface p-4 hover:bg-muted"
            >
              <span className="block text-sm text-muted-foreground">{stat.label}</span>
              <span className="mt-1 block text-3xl font-semibold">{stat.value}</span>
            </Link>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
