import Link from "next/link";
import type { RequestRow } from "../api";
import { SelectBox } from "./select-box";
import { PriorityBadge, StatusBadge } from "./badges";
import { DueCell, assigneeText, blockedText, projectText } from "./request-details";
import type { RowContext } from "./request-details";

const headerCell = "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const cell = "px-3 py-3 align-top";

export function RequestTable({
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
    <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Requests</caption>
        <thead className="border-b border-border">
          <tr>
            <th scope="col" className={headerCell}>
              <span className="sr-only">Select</span>
            </th>
            <th scope="col" className={headerCell}>
              Title
            </th>
            <th scope="col" className={headerCell}>
              Status
            </th>
            <th scope="col" className={headerCell}>
              Priority
            </th>
            <th scope="col" className={headerCell}>
              Assignee
            </th>
            <th scope="col" className={headerCell}>
              Project
            </th>
            <th scope="col" className={headerCell}>
              Due
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {requests.map((request) => {
            const reason = blockedText(request);
            return (
              <tr key={request.id}>
                <td className={cell}>
                  <SelectBox request={request} selected={selected} onToggle={onToggle} />
                </td>
                <th scope="row" className={`${cell} font-medium`}>
                  <Link href={`/app/requests/${request.id}`} className="text-primary underline">
                    {request.title}
                  </Link>
                </th>
                <td className={cell}>
                  <StatusBadge status={request.status} />
                  {reason ? (
                    <span className="mt-1 block text-xs text-muted-foreground">{reason}</span>
                  ) : null}
                </td>
                <td className={cell}>
                  <PriorityBadge priority={request.priority} />
                </td>
                <td className={cell}>{assigneeText(request, context)}</td>
                <td className={cell}>{projectText(request, context)}</td>
                <td className={cell}>
                  <DueCell request={request} now={context.now} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
