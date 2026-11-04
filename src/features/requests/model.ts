export const REQUEST_STATUSES = ["new", "in_progress", "waiting", "blocked", "done"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_PRIORITIES = ["low", "medium", "high"] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export const BLOCKED_REASONS = [
  "waiting_for_client",
  "waiting_for_team_decision",
  "technical_problem",
  "dependency_on_other_work",
] as const;
export type BlockedReason = (typeof BLOCKED_REASONS)[number];
