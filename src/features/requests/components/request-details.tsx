import { describeDue } from "../due-label";
import { BLOCKED_REASON_LABELS } from "../labels";
import type { RequestRow } from "../api";

export interface RowContext {
  memberNames: ReadonlyMap<string, string>;
  projectNames: ReadonlyMap<string, string>;
  now: Date;
}

export function assigneeText(request: RequestRow, context: RowContext): string {
  if (request.assigneeId === null) return "Unassigned";
  return context.memberNames.get(request.assigneeId) ?? "Unknown member";
}

export function projectText(request: RequestRow, context: RowContext): string {
  if (request.projectId === null) return "No project";
  return context.projectNames.get(request.projectId) ?? "Unknown project";
}

export function blockedText(request: RequestRow): string | null {
  return request.blockedReason === null ? null : BLOCKED_REASON_LABELS[request.blockedReason];
}

export function DueCell({ request, now }: { request: RequestRow; now: Date }) {
  const due = describeDue(request.dueDate, request.status, now);
  if (due.date === null) {
    return <span className="text-muted-foreground">No due date</span>;
  }
  return (
    <>
      <span>{due.date}</span>
      {due.note ? (
        <span
          className={`block text-xs ${due.overdue ? "font-medium text-danger" : "text-muted-foreground"}`}
        >
          {due.note}
        </span>
      ) : null}
    </>
  );
}
