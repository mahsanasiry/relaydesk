import { BLOCKED_REASON_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/features/requests/labels";
import type { ActivityEvent } from "./model";

function text(event: Pick<ActivityEvent, "metadata">, key: string): string | null {
  const value = event.metadata[key];
  return typeof value === "string" && value !== "" ? value : null;
}

// Labels are looked up defensively: an event outlives the code that wrote it, and an
// unfamiliar value should still read as something rather than "undefined".
function label(labels: Readonly<Record<string, string>>, value: string | null): string {
  if (value === null) return "none";
  return labels[value] ?? value;
}

/** What happened, as a phrase that follows the actor's name: "changed the priority from ...". */
export function describeActivityAction(event: Pick<ActivityEvent, "type" | "metadata">): string {
  switch (event.type) {
    case "request_created": {
      const status = text(event, "status");
      const priority = text(event, "priority");
      return status && priority
        ? `created the request (${label(STATUS_LABELS, status)}, ${label(PRIORITY_LABELS, priority).toLowerCase()} priority)`
        : "created the request";
    }
    case "request_deleted":
      return "deleted the request";
    case "request_archived":
      return "archived the request";
    case "request_unarchived":
      return "restored the request from the archive";
    case "comment_added":
      return "added a comment";
    case "status_changed": {
      const to = text(event, "to");
      const base = `changed the status from ${label(STATUS_LABELS, text(event, "from"))} to ${label(STATUS_LABELS, to)}`;
      if (to !== "blocked") return base;
      const reason = text(event, "blocked_reason");
      const note = text(event, "blocked_note");
      const detail = [reason ? label(BLOCKED_REASON_LABELS, reason) : null, note]
        .filter(Boolean)
        .join(": ");
      return detail ? `${base} (${detail})` : base;
    }
    case "blocked_reason_changed":
      return `changed the blocked reason from ${label(BLOCKED_REASON_LABELS, text(event, "from"))} to ${label(BLOCKED_REASON_LABELS, text(event, "to"))}`;
    case "priority_changed":
      return `changed the priority from ${label(PRIORITY_LABELS, text(event, "from"))} to ${label(PRIORITY_LABELS, text(event, "to"))}`;
    case "assignee_changed": {
      const from = text(event, "from");
      const to = text(event, "to");
      if (from === null && to !== null) return `assigned the request to ${to}`;
      if (from !== null && to === null) return `unassigned the request (was ${from})`;
      return `reassigned the request from ${from ?? "nobody"} to ${to ?? "nobody"}`;
    }
    case "due_date_changed": {
      const from = text(event, "from");
      const to = text(event, "to");
      if (from === null && to !== null) return `set the due date to ${to}`;
      if (from !== null && to === null) return `removed the due date (was ${from})`;
      return `moved the due date from ${from ?? "none"} to ${to ?? "none"}`;
    }
  }
}

export const FORMER_MEMBER = "Former member";

export function actorName(actorId: string | null, names: ReadonlyMap<string, string>): string {
  return actorId === null ? FORMER_MEMBER : (names.get(actorId) ?? FORMER_MEMBER);
}
