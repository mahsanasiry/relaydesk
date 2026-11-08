import { PRIORITY_LABELS, STATUS_LABELS } from "../labels";
import type { RequestPriority, RequestStatus } from "../model";

const base =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-current/20";

const STATUS_TONES: Record<RequestStatus, string> = {
  new: "bg-muted text-foreground",
  in_progress: "bg-primary-soft text-primary",
  waiting: "bg-warning-soft text-warning",
  blocked: "bg-danger-soft text-danger",
  done: "bg-success-soft text-success",
};

// The text always carries the meaning. Colour and the dot only reinforce it.
export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`${base} ${STATUS_TONES[status]}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const tone = priority === "high" ? "bg-danger-soft text-danger" : "bg-muted text-foreground";
  return <span className={`${base} ${tone}`}>{PRIORITY_LABELS[priority]}</span>;
}
