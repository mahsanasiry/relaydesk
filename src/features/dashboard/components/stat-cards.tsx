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
              className="block rounded-xl border border-border bg-linear-to-br from-surface to-primary-soft/60 p-4 shadow-card transition hover:border-primary motion-safe:hover:-translate-y-0.5"
            >
              <span className="block text-sm text-muted-foreground">{stat.label}</span>
              <span className="mt-1 block text-4xl font-bold tracking-tight tabular-nums">
                {stat.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
