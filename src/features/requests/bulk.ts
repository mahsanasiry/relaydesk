import { isRequestPriority, isRequestStatus } from "./model";
import type { BlockedReason, RequestPriority, RequestStatus } from "./model";
import { resolveStatusChange } from "./status-change";

export type BulkAction =
  | {
      kind: "status";
      status: RequestStatus;
      blockedReason: BlockedReason | null;
      blockedNote: string;
    }
  | { kind: "priority"; priority: RequestPriority }
  | { kind: "assignee"; assigneeId: string | null }
  | { kind: "archive" };

/** Column values written to every selected request. */
export type BulkPatch = Record<string, string | null>;

export type BulkPatchResult = { ok: true; patch: BulkPatch } | { ok: false; message: string };

export function buildBulkPatch(action: BulkAction, now: Date): BulkPatchResult {
  switch (action.kind) {
    case "status": {
      if (!isRequestStatus(action.status)) {
        return { ok: false, message: "Choose a status." };
      }
      // Every row is moved to the same target, so the current state only matters for the
      // "changed" flag, which a bulk update does not use.
      const result = resolveStatusChange(
        { status: "new", blockedReason: null, blockedNote: null },
        {
          status: action.status,
          blockedReason: action.blockedReason,
          blockedNote: action.blockedNote,
        },
      );
      if (!result.ok) {
        return { ok: false, message: result.message };
      }
      return {
        ok: true,
        patch: {
          status: result.value.status,
          blocked_reason: result.value.blockedReason,
          blocked_note: result.value.blockedNote,
        },
      };
    }
    case "priority":
      if (!isRequestPriority(action.priority)) {
        return { ok: false, message: "Choose a priority." };
      }
      return { ok: true, patch: { priority: action.priority } };
    case "assignee":
      return { ok: true, patch: { assignee_id: action.assigneeId } };
    case "archive":
      return { ok: true, patch: { archived_at: now.toISOString() } };
  }
}

export function toggleId(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

/** Selects every row on the page, or clears them when they were all selected already. */
export function togglePage(selected: ReadonlySet<string>, pageIds: readonly string[]): Set<string> {
  const next = new Set(selected);
  const all = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  for (const id of pageIds) {
    if (all) {
      next.delete(id);
    } else {
      next.add(id);
    }
  }
  return next;
}

/** Drops ids that are no longer visible so an action never reaches rows the person cannot see. */
export function visibleSelection(
  selected: ReadonlySet<string>,
  visibleIds: readonly string[],
): Set<string> {
  const visible = new Set(visibleIds);
  return new Set([...selected].filter((id) => visible.has(id)));
}

function plural(count: number): string {
  return count === 1 ? "1 request" : `${count} requests`;
}

export function describeBulkResult(action: BulkAction, updated: number, selected: number): string {
  if (updated < selected) {
    return `${updated} of ${selected} requests were updated. The rest no longer exist.`;
  }
  return action.kind === "archive" ? `${plural(updated)} archived.` : `${plural(updated)} updated.`;
}
