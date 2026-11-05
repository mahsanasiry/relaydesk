import { differenceInCalendarDays, parseDateOnly } from "@/lib/utils/dates";
import { isOpenStatus } from "./model";
import type { RequestStatus } from "./model";

interface DueCandidate {
  status: RequestStatus;
  dueDate: string | null;
}

/** Whole days from today to the due date, negative once it has passed. */
export function daysUntilDue(dueDate: string | null, now: Date): number | null {
  if (dueDate === null) {
    return null;
  }
  return differenceInCalendarDays(parseDateOnly(dueDate), now);
}

/** A request due today is not late yet, and finished work is never late. */
export function isOverdue(request: DueCandidate, now: Date): boolean {
  if (!isOpenStatus(request.status)) {
    return false;
  }
  const days = daysUntilDue(request.dueDate, now);
  return days !== null && days < 0;
}
