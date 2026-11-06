export const ACTIVITY_TYPES = [
  "request_created",
  "request_deleted",
  "status_changed",
  "blocked_reason_changed",
  "assignee_changed",
  "priority_changed",
  "due_date_changed",
  "request_archived",
  "request_unarchived",
  "comment_added",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityEvent {
  id: string;
  requestId: string | null;
  /** A snapshot taken when the event happened, so events about deleted requests stay readable. */
  requestTitle: string;
  actorId: string | null;
  type: ActivityType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type ActivityCategory =
  "status" | "assignee" | "priority" | "due_date" | "comments" | "lifecycle";

export type ActivityFilter = "all" | ActivityCategory;

export const ACTIVITY_FILTERS: readonly { value: ActivityFilter; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "status", label: "Status and blocked reason" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "due_date", label: "Due date" },
  { value: "comments", label: "Comments" },
  { value: "lifecycle", label: "Created, archived and deleted" },
];

const CATEGORIES: Record<ActivityType, ActivityCategory> = {
  request_created: "lifecycle",
  request_deleted: "lifecycle",
  request_archived: "lifecycle",
  request_unarchived: "lifecycle",
  status_changed: "status",
  blocked_reason_changed: "status",
  assignee_changed: "assignee",
  priority_changed: "priority",
  due_date_changed: "due_date",
  comment_added: "comments",
};

export function activityCategory(type: ActivityType): ActivityCategory {
  return CATEGORIES[type];
}

export function isActivityFilter(value: string): value is ActivityFilter {
  return ACTIVITY_FILTERS.some((filter) => filter.value === value);
}

export function filterActivity<T extends Pick<ActivityEvent, "type">>(
  events: readonly T[],
  filter: ActivityFilter,
): T[] {
  return filter === "all"
    ? [...events]
    : events.filter((event) => activityCategory(event.type) === filter);
}
