import Link from "next/link";
import { BLOCKED_REASON_LABELS } from "@/features/requests/labels";
import { requestsHref } from "../links";
import type { BlockedGroup, SummaryRequest } from "../summary";

const PREVIEW_COUNT = 3;

export function BlockedGroups({ groups }: { groups: readonly BlockedGroup<SummaryRequest>[] }) {
  return (
    <section aria-labelledby="blocked-heading" className="space-y-3">
      <h2 id="blocked-heading" className="text-lg font-semibold">
        Blocked, by reason
      </h2>
      <ul className="space-y-3">
        {groups.map((group) => (
          <li key={group.reason} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3">
              <Link
                href={requestsHref({ statuses: ["blocked"], blockedReason: group.reason })}
                className="font-medium text-primary underline"
              >
                {BLOCKED_REASON_LABELS[group.reason]}
              </Link>
              <span className="text-2xl font-semibold">{group.count}</span>
            </div>
            {group.count > 0 ? (
              <ul className="mt-2 space-y-1 text-sm">
                {group.requests.slice(0, PREVIEW_COUNT).map((request) => (
                  <li key={request.id}>
                    <Link href={`/app/requests/${request.id}`} className="underline">
                      {request.title}
                    </Link>
                  </li>
                ))}
                {group.count > PREVIEW_COUNT ? (
                  <li className="text-muted-foreground">and {group.count - PREVIEW_COUNT} more</li>
                ) : null}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
