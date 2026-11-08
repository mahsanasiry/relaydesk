import { BLOCKED_REASONS, isBlockedReason } from "@/features/requests/model";
import type { BlockedReason, RequestStatus } from "@/features/requests/model";
import type { ActivityEvent } from "@/features/activity/model";

/** How far back the report of cleared blockers looks. */
export const BLOCKER_HISTORY_DAYS = 90;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface StoppedRequest {
  id: string;
  title: string;
  status: RequestStatus;
  assigneeId: string | null;
  blockedReason: BlockedReason | null;
  statusChangedAt: string;
  archivedAt: string | null;
}

export interface StoppedItem<T extends StoppedRequest> {
  request: T;
  reason: BlockedReason;
  /** How long the request has been blocked, in milliseconds. */
  ms: number;
}

export interface StoppedNowRow {
  reason: BlockedReason;
  count: number;
  averageMs: number | null;
  longestMs: number | null;
}

export type BlockerEvent = Pick<ActivityEvent, "requestId" | "type" | "metadata" | "createdAt">;

export interface ResolvedRow {
  reason: BlockedReason;
  count: number;
  medianMs: number | null;
  longestMs: number | null;
}

/** "under an hour", "5 hours", "3 days": the unit that reads naturally for the length. */
export function formatDuration(ms: number): string {
  if (ms < HOUR_MS) {
    return "under an hour";
  }
  if (ms < 2 * DAY_MS) {
    const hours = Math.round(ms / HOUR_MS);
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${Math.round(ms / DAY_MS)} days`;
}

function stoppedItems<T extends StoppedRequest>(
  requests: readonly T[],
  now: Date,
): StoppedItem<T>[] {
  const items: StoppedItem<T>[] = [];
  for (const request of requests) {
    if (request.archivedAt !== null || request.status !== "blocked") {
      continue;
    }
    if (request.blockedReason === null) {
      continue;
    }
    items.push({
      request,
      reason: request.blockedReason,
      ms: Math.max(0, now.getTime() - Date.parse(request.statusChangedAt)),
    });
  }
  return items;
}

/** One row per reason, including reasons with nothing in them, so the list never reshuffles. */
export function buildStoppedNow(requests: readonly StoppedRequest[], now: Date): StoppedNowRow[] {
  const items = stoppedItems(requests, now);
  return BLOCKED_REASONS.map((reason) => {
    const durations = items.filter((item) => item.reason === reason).map((item) => item.ms);
    if (durations.length === 0) {
      return { reason, count: 0, averageMs: null, longestMs: null };
    }
    const total = durations.reduce((sum, ms) => sum + ms, 0);
    return {
      reason,
      count: durations.length,
      averageMs: total / durations.length,
      longestMs: Math.max(...durations),
    };
  });
}

/** The requests that have been blocked the longest, longest first. */
export function buildLongestStopped<T extends StoppedRequest>(
  requests: readonly T[],
  now: Date,
  limit: number,
): StoppedItem<T>[] {
  return stoppedItems(requests, now)
    .sort(
      (a, b) =>
        b.ms - a.ms ||
        a.request.title.localeCompare(b.request.title) ||
        a.request.id.localeCompare(b.request.id),
    )
    .slice(0, limit);
}

function median(sorted: readonly number[]): number {
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? 0;
  if (sorted.length % 2 === 1) {
    return upper;
  }
  return ((sorted[middle - 1] ?? upper) + upper) / 2;
}

function reasonOf(value: unknown): BlockedReason | null {
  return typeof value === "string" && isBlockedReason(value) ? value : null;
}

/**
 * Pairs each time a request became blocked with the time it left Blocked. A blocker that
 * changed reason while it lasted counts under the reason it had when it was cleared. Blockers
 * whose start or end falls outside the events given are left out rather than guessed at.
 */
export function buildResolvedBlockers(events: readonly BlockerEvent[]): ResolvedRow[] {
  const ordered = [...events].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const open = new Map<string, { since: number; reason: BlockedReason | null }>();
  const durations = new Map<BlockedReason, number[]>();

  for (const event of ordered) {
    if (event.requestId === null) {
      continue;
    }
    const at = Date.parse(event.createdAt);

    if (event.type === "status_changed") {
      if (event.metadata.to === "blocked") {
        open.set(event.requestId, { since: at, reason: reasonOf(event.metadata.blocked_reason) });
      } else if (event.metadata.from === "blocked") {
        const started = open.get(event.requestId);
        open.delete(event.requestId);
        if (started?.reason) {
          durations.set(started.reason, [
            ...(durations.get(started.reason) ?? []),
            Math.max(0, at - started.since),
          ]);
        }
      }
    } else if (event.type === "blocked_reason_changed") {
      const started = open.get(event.requestId);
      if (started) {
        started.reason = reasonOf(event.metadata.to) ?? started.reason;
      }
    }
  }

  return BLOCKED_REASONS.map((reason) => {
    const sorted = [...(durations.get(reason) ?? [])].sort((a, b) => a - b);
    if (sorted.length === 0) {
      return { reason, count: 0, medianMs: null, longestMs: null };
    }
    return {
      reason,
      count: sorted.length,
      medianMs: median(sorted),
      longestMs: sorted[sorted.length - 1] ?? null,
    };
  });
}
