import Link from "next/link";
import { requestsHref } from "@/features/dashboard/links";
import { BLOCKED_REASON_LABELS } from "@/features/requests/labels";
import { formatDuration } from "../report";
import type { StoppedNowRow } from "../report";

export function StoppedNow({ rows }: { rows: readonly StoppedNowRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const most = Math.max(1, ...rows.map((row) => row.count));

  return (
    <section aria-labelledby="stopped-now-heading" className="space-y-3">
      <h2 id="stopped-now-heading" className="text-lg font-semibold">
        Stopped right now
      </h2>
      <p className="text-sm text-muted-foreground">
        {total === 0
          ? "Nothing is blocked."
          : `${total === 1 ? "1 request is" : `${total} requests are`} blocked, grouped by why.`}
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface shadow-card">
        {rows.map((row) => (
          <li key={row.reason} className="space-y-2 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <Link
                href={requestsHref({ statuses: ["blocked"], blockedReason: row.reason })}
                className="font-medium text-primary underline"
              >
                {BLOCKED_REASON_LABELS[row.reason]}
              </Link>
              <span className="text-2xl font-bold tabular-nums">{row.count}</span>
            </div>
            <div aria-hidden="true" className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-danger"
                style={{ width: `${(row.count / most) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {row.averageMs === null || row.longestMs === null
                ? "Nothing is stopped for this reason."
                : `Blocked for ${formatDuration(row.averageMs)} on average, ${formatDuration(row.longestMs)} at the longest.`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
