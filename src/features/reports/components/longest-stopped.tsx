import Link from "next/link";
import { BLOCKED_REASON_LABELS } from "@/features/requests/labels";
import { formatDuration } from "../report";
import type { StoppedItem, StoppedRequest } from "../report";

interface LongestStoppedProps {
  items: readonly StoppedItem<StoppedRequest>[];
  memberNames: ReadonlyMap<string, string>;
}

export function LongestStopped({ items, memberNames }: LongestStoppedProps) {
  return (
    <section aria-labelledby="longest-stopped-heading" className="space-y-3">
      <h2 id="longest-stopped-heading" className="text-lg font-semibold">
        Stopped the longest
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground shadow-card">
          Nothing is blocked right now.
        </p>
      ) : (
        <ol className="divide-y divide-border rounded-xl border border-border bg-surface shadow-card">
          {items.map(({ request, reason, ms }) => (
            <li key={request.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
              <Link
                href={`/app/requests/${request.id}`}
                className="font-medium text-primary underline"
              >
                {request.title}
              </Link>
              <span className="text-sm text-muted-foreground">
                {BLOCKED_REASON_LABELS[reason]}
                {" · "}
                {request.assigneeId === null
                  ? "Unassigned"
                  : (memberNames.get(request.assigneeId) ?? "Unknown member")}
              </span>
              <span className="ml-auto text-sm font-semibold tabular-nums">
                {formatDuration(ms)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
