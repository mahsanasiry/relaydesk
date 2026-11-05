import { parseLabels } from "@/lib/validation/request";
import type { RequestFormValues } from "@/lib/validation/request";
import { isBlockedReason } from "./model";
import type { RequestDetail } from "./detail-api";
import { resolveStatusChange } from "./status-change";

export interface RequestRecordInput {
  title: string;
  description: string;
  status: RequestFormValues["status"];
  priority: RequestFormValues["priority"];
  assignee_id: string | null;
  project_id: string | null;
  due_date: string | null;
  labels: string[];
  blocked_reason: string | null;
  blocked_note: string | null;
}

export function emptyFormValues(projectId = ""): RequestFormValues {
  return {
    title: "",
    description: "",
    status: "new",
    priority: "medium",
    assigneeId: "",
    projectId,
    dueDate: "",
    labels: "",
    blockedReason: "",
    blockedNote: "",
  };
}

export function toFormValues(request: RequestDetail): RequestFormValues {
  return {
    title: request.title,
    description: request.description,
    status: request.status,
    priority: request.priority,
    assigneeId: request.assigneeId ?? "",
    projectId: request.projectId ?? "",
    dueDate: request.dueDate ?? "",
    labels: request.labels.join(", "),
    blockedReason: request.blockedReason ?? "",
    blockedNote: request.blockedNote ?? "",
  };
}

/** The column values for a validated form, with the blocked fields settled by the status rules. */
export function toRecord(values: RequestFormValues): RequestRecordInput {
  const change = resolveStatusChange(
    { status: "new", blockedReason: null, blockedNote: null },
    {
      status: values.status,
      blockedReason: isBlockedReason(values.blockedReason) ? values.blockedReason : null,
      blockedNote: values.blockedNote,
    },
  );
  if (!change.ok) {
    throw new Error(change.message);
  }

  return {
    title: values.title.trim(),
    description: values.description,
    status: change.value.status,
    priority: values.priority,
    assignee_id: values.assigneeId || null,
    project_id: values.projectId || null,
    due_date: values.dueDate || null,
    labels: parseLabels(values.labels),
    blocked_reason: change.value.blockedReason,
    blocked_note: change.value.blockedNote,
  };
}
