import { daysUntilDue } from "./due";
import { isOpenStatus } from "./model";
import type { RequestStatus } from "./model";

export interface DueLabel {
  /** The date itself, or null when the request has none. */
  date: string | null;
  /** How the date relates to today. Finished work has none, because it can no longer be late. */
  note: string | null;
  overdue: boolean;
}

function days(count: number): string {
  return count === 1 ? "1 day" : `${count} days`;
}

export function describeDue(dueDate: string | null, status: RequestStatus, now: Date): DueLabel {
  const remaining = daysUntilDue(dueDate, now);
  if (remaining === null || !isOpenStatus(status)) {
    return { date: dueDate, note: null, overdue: false };
  }
  if (remaining < 0) {
    return { date: dueDate, note: `Overdue by ${days(-remaining)}`, overdue: true };
  }
  if (remaining === 0) {
    return { date: dueDate, note: "Due today", overdue: false };
  }
  return { date: dueDate, note: `Due in ${days(remaining)}`, overdue: false };
}
