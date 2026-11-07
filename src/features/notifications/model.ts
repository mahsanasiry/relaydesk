export const NOTIFICATION_TYPES = [
  "request_assigned",
  "comment_added",
  "due_soon",
  "request_unblocked",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  type: NotificationType;
  requestId: string;
  /** Looked up separately and may be missing if the request is no longer visible. */
  requestTitle: string | null;
  actorId: string | null;
  readAt: string | null;
  createdAt: string;
}

export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

export const UNKNOWN_ACTOR = "Someone";

/** One sentence about what happened, starting with who did it when someone did. */
export function describeNotification(type: NotificationType, actorName: string | null): string {
  const actor = actorName ?? UNKNOWN_ACTOR;
  switch (type) {
    case "request_assigned":
      return `${actor} assigned this request to you.`;
    case "comment_added":
      return `${actor} commented on this request.`;
    case "due_soon":
      return "This request is due soon.";
    case "request_unblocked":
      return `${actor} unblocked this request.`;
  }
}

export function countUnread(notifications: readonly Pick<Notification, "readAt">[]): number {
  return notifications.filter((notification) => notification.readAt === null).length;
}

/** The badge shows a number up to 99 and then stops growing. */
export function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}
