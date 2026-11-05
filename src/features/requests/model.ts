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

export const OPEN_STATUSES: readonly RequestStatus[] = REQUEST_STATUSES.filter(
  (status) => status !== "done",
);

export function isOpenStatus(status: RequestStatus): boolean {
  return status !== "done";
}

export function isRequestStatus(value: string): value is RequestStatus {
  return (REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isRequestPriority(value: string): value is RequestPriority {
  return (REQUEST_PRIORITIES as readonly string[]).includes(value);
}

export function isBlockedReason(value: string): value is BlockedReason {
  return (BLOCKED_REASONS as readonly string[]).includes(value);
}
