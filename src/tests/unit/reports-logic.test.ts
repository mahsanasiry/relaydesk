import { describe, expect, it } from "vitest";
import {
  buildLongestStopped,
  buildResolvedBlockers,
  buildStoppedNow,
  formatDuration,
} from "@/features/reports/report";
import type { BlockerEvent, StoppedRequest } from "@/features/reports/report";

const NOW = new Date("2026-11-04T10:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function blocked(overrides: Partial<StoppedRequest>): StoppedRequest {
  return {
    id: "r",
    title: "A request",
    status: "blocked",
    assigneeId: null,
    blockedReason: "technical_problem",
    statusChangedAt: "2026-11-03T10:00:00Z",
    archivedAt: null,
    ...overrides,
  };
}

function event(
  requestId: string | null,
  type: BlockerEvent["type"],
  createdAt: string,
  metadata: Record<string, unknown>,
): BlockerEvent {
  return { requestId, type, createdAt, metadata };
}

describe("formatDuration", () => {
  it("picks the unit that reads naturally", () => {
    expect(formatDuration(20 * 60 * 1000)).toBe("under an hour");
    expect(formatDuration(HOUR)).toBe("1 hour");
    expect(formatDuration(5 * HOUR)).toBe("5 hours");
    expect(formatDuration(DAY)).toBe("24 hours");
    expect(formatDuration(2 * DAY)).toBe("2 days");
    expect(formatDuration(10 * DAY)).toBe("10 days");
  });
});

describe("buildStoppedNow", () => {
  it("counts blocked requests per reason and measures how long they have been blocked", () => {
    const rows = buildStoppedNow(
      [
        blocked({ id: "a", statusChangedAt: "2026-11-01T10:00:00Z" }),
        blocked({ id: "b", statusChangedAt: "2026-11-03T10:00:00Z" }),
        blocked({
          id: "c",
          blockedReason: "waiting_for_client",
          statusChangedAt: "2026-11-04T07:00:00Z",
        }),
      ],
      NOW,
    );

    expect(rows.find((row) => row.reason === "technical_problem")).toEqual({
      reason: "technical_problem",
      count: 2,
      averageMs: 2 * DAY,
      longestMs: 3 * DAY,
    });
    expect(rows.find((row) => row.reason === "waiting_for_client")).toMatchObject({
      count: 1,
      averageMs: 3 * HOUR,
    });
  });

  it("keeps a row for every reason, in a fixed order", () => {
    const rows = buildStoppedNow([], NOW);

    expect(rows.map((row) => row.reason)).toEqual([
      "waiting_for_client",
      "waiting_for_team_decision",
      "technical_problem",
      "dependency_on_other_work",
    ]);
    expect(rows.every((row) => row.count === 0 && row.averageMs === null)).toBe(true);
  });

  it("ignores requests that are not blocked or are archived", () => {
    const rows = buildStoppedNow(
      [
        blocked({ id: "done", status: "done", blockedReason: null }),
        blocked({ id: "old", archivedAt: "2026-11-02T10:00:00Z" }),
      ],
      NOW,
    );

    expect(rows.reduce((sum, row) => sum + row.count, 0)).toBe(0);
  });
});

describe("buildLongestStopped", () => {
  it("lists the longest blockers first and respects the limit", () => {
    const items = buildLongestStopped(
      [
        blocked({ id: "a", title: "Short", statusChangedAt: "2026-11-04T08:00:00Z" }),
        blocked({ id: "b", title: "Long", statusChangedAt: "2026-10-20T10:00:00Z" }),
        blocked({ id: "c", title: "Middle", statusChangedAt: "2026-11-01T10:00:00Z" }),
      ],
      NOW,
      2,
    );

    expect(items.map((item) => item.request.id)).toEqual(["b", "c"]);
    expect(items[0]?.ms).toBe(15 * DAY);
  });

  it("never reports a negative time when a clock is ahead", () => {
    const [item] = buildLongestStopped(
      [blocked({ statusChangedAt: "2026-11-05T10:00:00Z" })],
      NOW,
      1,
    );

    expect(item?.ms).toBe(0);
  });
});

describe("buildResolvedBlockers", () => {
  it("measures the time between becoming blocked and leaving Blocked", () => {
    const rows = buildResolvedBlockers([
      event("r1", "status_changed", "2026-10-01T10:00:00Z", {
        from: "in_progress",
        to: "blocked",
        blocked_reason: "technical_problem",
      }),
      event("r1", "status_changed", "2026-10-03T10:00:00Z", {
        from: "blocked",
        to: "in_progress",
      }),
    ]);

    expect(rows.find((row) => row.reason === "technical_problem")).toEqual({
      reason: "technical_problem",
      count: 1,
      medianMs: 2 * DAY,
      longestMs: 2 * DAY,
    });
  });

  it("counts a blocker under the reason it had when it was cleared", () => {
    const rows = buildResolvedBlockers([
      event("r2", "status_changed", "2026-10-10T10:00:00Z", {
        from: "new",
        to: "blocked",
        blocked_reason: "waiting_for_client",
      }),
      event("r2", "blocked_reason_changed", "2026-10-11T10:00:00Z", {
        from: "waiting_for_client",
        to: "technical_problem",
      }),
      event("r2", "status_changed", "2026-10-14T10:00:00Z", { from: "blocked", to: "waiting" }),
    ]);

    expect(rows.find((row) => row.reason === "waiting_for_client")?.count).toBe(0);
    expect(rows.find((row) => row.reason === "technical_problem")?.longestMs).toBe(4 * DAY);
  });

  it("reports the median and the longest of several blockers, whatever order they arrive in", () => {
    const start = (id: string, at: string) =>
      event(id, "status_changed", at, {
        from: "new",
        to: "blocked",
        blocked_reason: "technical_problem",
      });
    const end = (id: string, at: string) =>
      event(id, "status_changed", at, { from: "blocked", to: "done" });

    const rows = buildResolvedBlockers([
      end("b", "2026-10-09T10:00:00Z"),
      start("a", "2026-10-01T10:00:00Z"),
      end("a", "2026-10-03T10:00:00Z"),
      start("b", "2026-10-05T10:00:00Z"),
    ]);

    expect(rows.find((row) => row.reason === "technical_problem")).toEqual({
      reason: "technical_problem",
      count: 2,
      medianMs: 3 * DAY,
      longestMs: 4 * DAY,
    });
  });

  it("leaves out blockers that are still open and ends it cannot match to a start", () => {
    const rows = buildResolvedBlockers([
      event("open", "status_changed", "2026-10-01T10:00:00Z", {
        from: "new",
        to: "blocked",
        blocked_reason: "technical_problem",
      }),
      event("orphan", "status_changed", "2026-10-02T10:00:00Z", { from: "blocked", to: "done" }),
      event(null, "status_changed", "2026-10-03T10:00:00Z", { from: "blocked", to: "done" }),
    ]);

    expect(rows.reduce((sum, row) => sum + row.count, 0)).toBe(0);
  });
});
