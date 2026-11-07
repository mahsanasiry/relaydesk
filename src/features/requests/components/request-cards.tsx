import Link from "next/link";
import type { RequestRow } from "../api";
import { SelectBox } from "./select-box";
import { PriorityBadge, StatusBadge } from "./badges";
import { DueCell, assigneeText, blockedText, projectText } from "./request-details";
import type { RowContext } from "./request-details";

export function RequestCards({
  requests,
  context,
  selected,
  onToggle,
}: {
  requests: readonly RequestRow[];
  context: RowContext;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="space-y-3 md:hidden">
      {requests.map((request) => {
        const reason = blockedText(request);
        return (
          <li key={request.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <SelectBox request={request} selected={selected} onToggle={onToggle} />
              <Link
                href={`/app/requests/${request.id}`}
                className="font-medium text-primary underline"
              >
                {request.title}
              </Link>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
              {reason ? <span className="text-xs text-muted-foreground">{reason}</span> : null}
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Assignee</dt>
              <dd>{assigneeText(request, context)}</dd>
              <dt className="text-muted-foreground">Project</dt>
              <dd>{projectText(request, context)}</dd>
              <dt className="text-muted-foreground">Due</dt>
              <dd>
                <DueCell request={request} now={context.now} />
              </dd>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
