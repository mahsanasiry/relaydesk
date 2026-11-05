import { describe, expect, it } from "vitest";
import { DEFAULT_ATTENTION_SETTINGS } from "@/features/dashboard/attention";
import { buildDashboardSummary } from "@/features/dashboard/summary";
import type { SummaryRequest } from "@/features/dashboard/summary";
import { BLOCKED_REASONS } from "@/features/requests/model";

const NOW = new Date("2026-11-04T10:00:00Z");
const ME = "me-id";

function request(overrides: Partial<SummaryRequest> = {}): SummaryRequest {
  return {
    id: "r",
    title: "A request",
    status: "in_progress",
    priority: "medium",
    assigneeId: "someone",
    dueDate: null,
    statusChangedAt: "2026-11-03T09:00:00Z",
    archivedAt: null,
    blockedReason: null,
    ...overrides,
  };
}

function summarize(requests: SummaryRequest[], projects: { status: "active" }[] = []) {
  return buildDashboardSummary({
    requests,
    projects,
    currentUserId: ME,
    settings: DEFAULT_ATTENTION_SETTINGS,
    now: NOW,
  });
}

describe("buildDashboardSummary", () => {
  it("counts open work and leaves out finished and archived requests", () => {
    const summary = summarize([
      request({ id: "1" }),
      request({ id: "2", status: "new" }),
      request({ id: "3", status: "done" }),
      request({ id: "4", archivedAt: "2026-10-01T00:00:00Z" }),
    ]);

    expect(summary.openCount).toBe(2);
  });

  it("counts overdue work", () => {
    const summary = summarize([
      request({ id: "1", dueDate: "2026-11-01" }),
      request({ id: "2", dueDate: "2026-11-04" }),
      request({ id: "3", dueDate: "2026-10-01", status: "done" }),
    ]);

    expect(summary.overdueCount).toBe(1);
  });

  it("counts requests waiting for a response", () => {
    const summary = summarize([
      request({ id: "1", status: "waiting" }),
      request({ id: "2", status: "waiting" }),
      request({ id: "3", status: "blocked", blockedReason: "technical_problem" }),
    ]);

    expect(summary.waitingCount).toBe(2);
  });

  it("counts open work assigned to the current user only", () => {
    const summary = summarize([
      request({ id: "1", assigneeId: ME }),
      request({ id: "2", assigneeId: ME, status: "done" }),
      request({ id: "3", assigneeId: "someone" }),
      request({ id: "4", assigneeId: null }),
    ]);

    expect(summary.assignedToMeCount).toBe(1);
  });

  it("groups blocked work by reason and lists every reason, even with nothing in it", () => {
    const summary = summarize([
      request({ id: "1", status: "blocked", blockedReason: "waiting_for_client" }),
      request({ id: "2", status: "blocked", blockedReason: "waiting_for_client" }),
      request({ id: "3", status: "blocked", blockedReason: "technical_problem" }),
      request({ id: "4", status: "in_progress" }),
    ]);

    expect(summary.blockedByReason.map((group) => group.reason)).toEqual([...BLOCKED_REASONS]);
    expect(summary.blockedByReason.map((group) => group.count)).toEqual([2, 0, 1, 0]);
    expect(summary.blockedByReason[0]?.requests.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("counts projects by status including empty statuses", () => {
    const summary = buildDashboardSummary({
      requests: [],
      projects: [{ status: "active" }, { status: "active" }, { status: "on_hold" }],
      currentUserId: ME,
      settings: DEFAULT_ATTENTION_SETTINGS,
      now: NOW,
    });

    expect(summary.projectStatusCounts).toEqual({
      planned: 0,
      active: 2,
      on_hold: 1,
      completed: 0,
    });
  });

  it("includes the attention list and ignores archived requests in it", () => {
    const summary = summarize([
      request({ id: "1", assigneeId: null }),
      request({ id: "2", assigneeId: null, archivedAt: "2026-10-01T00:00:00Z" }),
    ]);

    expect(summary.needsAttention.map((item) => item.request.id)).toEqual(["1"]);
  });

  it("returns zeros for an empty workspace", () => {
    const summary = summarize([]);

    expect(summary.openCount).toBe(0);
    expect(summary.overdueCount).toBe(0);
    expect(summary.waitingCount).toBe(0);
    expect(summary.assignedToMeCount).toBe(0);
    expect(summary.needsAttention).toEqual([]);
  });
});
