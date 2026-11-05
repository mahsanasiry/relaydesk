import { isBlockedReason } from "./model";
import type { BlockedReason, RequestStatus } from "./model";

export const BLOCKED_NOTE_MAX_LENGTH = 1000;

export interface StatusState {
  status: RequestStatus;
  blockedReason: BlockedReason | null;
  blockedNote: string | null;
}

export interface StatusChangeInput {
  status: RequestStatus;
  blockedReason?: BlockedReason | null;
  blockedNote?: string | null;
}

export type StatusChangeResult =
  | { ok: true; changed: boolean; value: StatusState }
  | { ok: false; field: "blockedReason" | "blockedNote"; message: string };

export function requiresBlockedReason(status: RequestStatus): boolean {
  return status === "blocked";
}

/**
 * Works out the state a request ends up in after a status change. Blocked needs a reason,
 * and every other status clears the reason and note, matching the database constraint.
 */
export function resolveStatusChange(
  current: StatusState,
  input: StatusChangeInput,
): StatusChangeResult {
  let next: StatusState;

  if (requiresBlockedReason(input.status)) {
    const reason = input.blockedReason;
    if (!reason || !isBlockedReason(reason)) {
      return {
        ok: false,
        field: "blockedReason",
        message: "Choose why this request is blocked.",
      };
    }

    const note = (input.blockedNote ?? "").trim();
    if (note.length > BLOCKED_NOTE_MAX_LENGTH) {
      return {
        ok: false,
        field: "blockedNote",
        message: `Keep the note to ${BLOCKED_NOTE_MAX_LENGTH} characters or fewer.`,
      };
    }

    next = { status: "blocked", blockedReason: reason, blockedNote: note === "" ? null : note };
  } else {
    next = { status: input.status, blockedReason: null, blockedNote: null };
  }

  const changed =
    next.status !== current.status ||
    next.blockedReason !== current.blockedReason ||
    next.blockedNote !== current.blockedNote;

  return { ok: true, changed, value: next };
}
