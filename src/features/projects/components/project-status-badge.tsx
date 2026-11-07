import { PROJECT_STATUS_LABELS } from "../labels";
import type { ProjectStatus } from "../model";

const TONES: Record<ProjectStatus, string> = {
  planned: "border-border",
  active: "border-primary text-primary",
  on_hold: "border-warning text-warning",
  completed: "border-success text-success",
};

// The text carries the meaning. Colour only reinforces it.
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}
