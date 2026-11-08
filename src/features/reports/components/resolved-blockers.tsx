import { BLOCKED_REASON_LABELS } from "@/features/requests/labels";
import { BLOCKER_HISTORY_DAYS, formatDuration } from "../report";
import type { ResolvedRow } from "../report";

export function ResolvedBlockers({ rows }: { rows: readonly ResolvedRow[] }) {
  const cleared = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section aria-labelledby="resolved-heading" className="space-y-3">
      <h2 id="resolved-heading" className="text-lg font-semibold">
        How long blockers last
      </h2>
      <p className="text-sm text-muted-foreground">
        Blockers that started and were cleared in the last {BLOCKER_HISTORY_DAYS} days.
      </p>
      {cleared === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground shadow-card">
          No blocker has been cleared in the last {BLOCKER_HISTORY_DAYS} days.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Reason
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Cleared
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Typical length
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Longest
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.reason}>
                  <th scope="row" className="px-4 py-3 font-medium">
                    {BLOCKED_REASON_LABELS[row.reason]}
                  </th>
                  <td className="px-4 py-3 tabular-nums">{row.count}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.medianMs === null ? "None yet" : formatDuration(row.medianMs)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.longestMs === null ? "None yet" : formatDuration(row.longestMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
