import type { BlockedReason, RequestPriority, RequestStatus } from "./model";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  in_progress: "In progress",
  waiting: "Waiting",
  blocked: "Blocked",
  done: "Done",
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const BLOCKED_REASON_LABELS: Record<BlockedReason, string> = {
  waiting_for_client: "Waiting for client",
  waiting_for_team_decision: "Waiting for team decision",
  technical_problem: "Technical problem",
  dependency_on_other_work: "Dependency on other work",
};
