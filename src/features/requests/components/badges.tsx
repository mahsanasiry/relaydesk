import { PRIORITY_LABELS, STATUS_LABELS } from "../labels";
import type { RequestPriority, RequestStatus } from "../model";

const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

const STATUS_TONES: Record<RequestStatus, string> = {
  new: "border-border",
  in_progress: "border-primary text-primary",
  waiting: "border-warning text-warning",
  blocked: "border-danger text-danger",
  done: "border-success text-success",
};

// The text always carries the meaning. Colour only reinforces it.
export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`${base} ${STATUS_TONES[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const tone = priority === "high" ? "border-danger text-danger" : "border-border";
  return <span className={`${base} ${tone}`}>{PRIORITY_LABELS[priority]}</span>;
}
