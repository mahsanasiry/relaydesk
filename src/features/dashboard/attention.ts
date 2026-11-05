import { daysUntilDue, isOverdue } from "@/features/requests/due";
import { isOpenStatus } from "@/features/requests/model";
import type { RequestPriority, RequestStatus } from "@/features/requests/model";
import { differenceInCalendarDays } from "@/lib/utils/dates";

// The order is also the priority: an item is listed under the first rule it matches.
export const ATTENTION_RULES = [
  "overdue",
  "high_priority_due_soon",
  "waiting_too_long",
  "unassigned",
] as const;
export type AttentionRule = (typeof ATTENTION_RULES)[number];

export interface AttentionSettings {
  waitingThresholdDays: number;
  dueWindowDays: number;
}

export const DEFAULT_ATTENTION_SETTINGS: AttentionSettings = {
  waitingThresholdDays: 3,
  dueWindowDays: 2,
};

export interface AttentionCandidate {
  id: string;
  title: string;
  status: RequestStatus;
  priority: RequestPriority;
  assigneeId: string | null;
  dueDate: string | null;
  statusChangedAt: string;
  archivedAt: string | null;
}

export interface AttentionReason {
  rule: AttentionRule;
  message: string;
}

export interface AttentionItem<T extends AttentionCandidate> {
  request: T;
  reasons: [AttentionReason, ...AttentionReason[]];
}

function days(count: number): string {
  return count === 1 ? "1 day" : `${count} days`;
}

function overdueMessage(request: AttentionCandidate, now: Date): string | null {
  const remaining = daysUntilDue(request.dueDate, now);
  if (remaining === null || !isOverdue(request, now)) {
    return null;
  }
  return `Overdue by ${days(-remaining)} (due ${request.dueDate})`;
}

// Overdue work is reported by the overdue rule, so this one only covers what is still ahead.
function dueSoonMessage(
  request: AttentionCandidate,
  settings: AttentionSettings,
  now: Date,
): string | null {
  const remaining = daysUntilDue(request.dueDate, now);
  if (request.priority !== "high" || remaining === null) {
    return null;
  }
  if (remaining < 0 || remaining > settings.dueWindowDays) {
    return null;
  }
  return remaining === 0
    ? "High priority and due today"
    : `High priority and due in ${days(remaining)}`;
}

function waitingMessage(
  request: AttentionCandidate,
  settings: AttentionSettings,
  now: Date,
): string | null {
  if (request.status !== "waiting") {
    return null;
  }
  const waited = differenceInCalendarDays(now, new Date(request.statusChangedAt));
  if (waited <= settings.waitingThresholdDays) {
    return null;
  }
  return `Waiting for ${days(waited)}, longer than the ${days(settings.waitingThresholdDays)} limit`;
}

function unassignedMessage(request: AttentionCandidate): string | null {
  return request.assigneeId === null ? "No one is assigned" : null;
}

function messageFor(
  rule: AttentionRule,
  request: AttentionCandidate,
  settings: AttentionSettings,
  now: Date,
): string | null {
  switch (rule) {
    case "overdue":
      return overdueMessage(request, now);
    case "high_priority_due_soon":
      return dueSoonMessage(request, settings, now);
    case "waiting_too_long":
      return waitingMessage(request, settings, now);
    case "unassigned":
      return unassignedMessage(request);
  }
}

/** Every rule the request currently breaks, in rule order. Finished and archived work is exempt. */
export function evaluateAttention(
  request: AttentionCandidate,
  settings: AttentionSettings,
  now: Date,
): AttentionReason[] {
  if (request.archivedAt !== null || !isOpenStatus(request.status)) {
    return [];
  }

  const reasons: AttentionReason[] = [];
  for (const rule of ATTENTION_RULES) {
    const message = messageFor(rule, request, settings, now);
    if (message !== null) {
      reasons.push({ rule, message });
    }
  }
  return reasons;
}

function rank(item: AttentionItem<AttentionCandidate>): number {
  return ATTENTION_RULES.indexOf(item.reasons[0].rule);
}

function compareDueDates(a: string | null, b: string | null): number {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return a < b ? -1 : 1;
}

/**
 * Requests that need a person to look at them, most pressing rule first, then earliest due
 * date, then title. There is no score: the order follows from the rules alone.
 */
export function findNeedsAttention<T extends AttentionCandidate>(
  requests: readonly T[],
  settings: AttentionSettings,
  now: Date,
): AttentionItem<T>[] {
  const items: AttentionItem<T>[] = [];

  for (const request of requests) {
    const [first, ...rest] = evaluateAttention(request, settings, now);
    if (first) {
      items.push({ request, reasons: [first, ...rest] });
    }
  }

  return items.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      compareDueDates(a.request.dueDate, b.request.dueDate) ||
      a.request.title.localeCompare(b.request.title) ||
      a.request.id.localeCompare(b.request.id),
  );
}
