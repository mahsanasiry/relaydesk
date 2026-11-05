import { describe, expect, it } from "vitest";
import {
  ATTENTION_RULES,
  DEFAULT_ATTENTION_SETTINGS,
  evaluateAttention,
  findNeedsAttention,
} from "@/features/dashboard/attention";
import type { AttentionCandidate } from "@/features/dashboard/attention";
import { buildSeedPlan } from "../../../scripts/seed/plan.ts";

const NOW = new Date("2026-11-04T10:00:00Z");
const settings = DEFAULT_ATTENTION_SETTINGS;

function request(overrides: Partial<AttentionCandidate> = {}): AttentionCandidate {
  return {
    id: "r1",
    title: "A request",
    status: "in_progress",
    priority: "medium",
    assigneeId: "member-1",
    dueDate: null,
    statusChangedAt: "2026-11-03T09:00:00Z",
    archivedAt: null,
    ...overrides,
  };
}

function rulesFor(candidate: AttentionCandidate, custom = settings): string[] {
  return evaluateAttention(candidate, custom, NOW).map((reason) => reason.rule);
}

describe("overdue rule", () => {
  it("flags open work past its due date and says by how much", () => {
    const [reason] = evaluateAttention(request({ dueDate: "2026-11-03" }), settings, NOW);

    expect(reason).toEqual({ rule: "overdue", message: "Overdue by 1 day (due 2026-11-03)" });
  });

  it("uses the plural for longer delays", () => {
    const [reason] = evaluateAttention(request({ dueDate: "2026-10-30" }), settings, NOW);

    expect(reason?.message).toBe("Overdue by 5 days (due 2026-10-30)");
  });

  it("does not flag work that is due today", () => {
    expect(rulesFor(request({ dueDate: "2026-11-04" }))).toEqual([]);
  });

  it("does not flag finished work", () => {
    expect(rulesFor(request({ status: "done", dueDate: "2026-10-01" }))).toEqual([]);
  });
});

describe("high priority due soon rule", () => {
  const high = { priority: "high" } as const;

  it("flags high priority work due today", () => {
    const [reason] = evaluateAttention(request({ ...high, dueDate: "2026-11-04" }), settings, NOW);

    expect(reason).toEqual({
      rule: "high_priority_due_soon",
      message: "High priority and due today",
    });
  });

  it("flags work due on the last day of the window but not the day after", () => {
    const edge = evaluateAttention(request({ ...high, dueDate: "2026-11-06" }), settings, NOW);

    expect(edge[0]?.message).toBe("High priority and due in 2 days");
    expect(rulesFor(request({ ...high, dueDate: "2026-11-07" }))).toEqual([]);
  });

  it("describes one day as singular", () => {
    const [reason] = evaluateAttention(request({ ...high, dueDate: "2026-11-05" }), settings, NOW);

    expect(reason?.message).toBe("High priority and due in 1 day");
  });

  it("ignores other priorities", () => {
    expect(rulesFor(request({ priority: "medium", dueDate: "2026-11-05" }))).toEqual([]);
  });

  it("leaves overdue work to the overdue rule", () => {
    expect(rulesFor(request({ ...high, dueDate: "2026-11-03" }))).toEqual(["overdue"]);
  });

  it("follows the configured window", () => {
    const wide = { ...settings, dueWindowDays: 5 };

    expect(rulesFor(request({ ...high, dueDate: "2026-11-09" }), wide)).toEqual([
      "high_priority_due_soon",
    ]);
  });
});

describe("waiting too long rule", () => {
  const waiting = { status: "waiting" } as const;

  it("flags waiting beyond the threshold and says how long", () => {
    const [reason] = evaluateAttention(
      request({ ...waiting, statusChangedAt: "2026-10-31T09:00:00Z" }),
      settings,
      NOW,
    );

    expect(reason).toEqual({
      rule: "waiting_too_long",
      message: "Waiting for 4 days, longer than the 3 days limit",
    });
  });

  it("does not flag waiting that is exactly at the threshold", () => {
    expect(rulesFor(request({ ...waiting, statusChangedAt: "2026-11-01T09:00:00Z" }))).toEqual([]);
  });

  it("only applies to Waiting", () => {
    expect(
      rulesFor(request({ status: "blocked", statusChangedAt: "2026-10-01T09:00:00Z" })),
    ).toEqual([]);
  });

  it("follows the configured threshold", () => {
    const strict = { ...settings, waitingThresholdDays: 5 };
    const patient = request({ ...waiting, statusChangedAt: "2026-10-31T09:00:00Z" });

    expect(rulesFor(patient, strict)).toEqual([]);
    expect(rulesFor(patient, { ...settings, waitingThresholdDays: 1 })).toEqual([
      "waiting_too_long",
    ]);
  });
});

describe("unassigned rule", () => {
  it("flags open work nobody owns", () => {
    const [reason] = evaluateAttention(request({ assigneeId: null }), settings, NOW);

    expect(reason).toEqual({ rule: "unassigned", message: "No one is assigned" });
  });

  it("does not flag finished work", () => {
    expect(rulesFor(request({ assigneeId: null, status: "done" }))).toEqual([]);
  });
});

describe("archived work", () => {
  it("never needs attention", () => {
    const archived = request({
      assigneeId: null,
      dueDate: "2026-10-01",
      archivedAt: "2026-10-15T00:00:00Z",
    });

    expect(rulesFor(archived)).toEqual([]);
  });
});

describe("findNeedsAttention", () => {
  it("lists every rule a request breaks, in rule order", () => {
    const [item] = findNeedsAttention(
      [request({ assigneeId: null, dueDate: "2026-11-02" })],
      settings,
      NOW,
    );

    expect(item?.reasons.map((reason) => reason.rule)).toEqual(["overdue", "unassigned"]);
  });

  it("leaves out requests that break no rule", () => {
    expect(findNeedsAttention([request()], settings, NOW)).toEqual([]);
  });

  it("orders by rule, then earliest due date with no date last, then title", () => {
    const requests = [
      request({ id: "a", title: "Unassigned", assigneeId: null }),
      request({ id: "b", title: "Late later", dueDate: "2026-11-02" }),
      request({ id: "c", title: "Late earlier", dueDate: "2026-10-28" }),
      request({ id: "d", title: "Due soon", priority: "high", dueDate: "2026-11-05" }),
      request({ id: "e", title: "Also unassigned", assigneeId: null }),
    ];

    const ids = findNeedsAttention(requests, settings, NOW).map((item) => item.request.id);

    expect(ids).toEqual(["c", "b", "d", "e", "a"]);
  });

  it("keeps the original request object on each item", () => {
    const original = request({ assigneeId: null });
    const [item] = findNeedsAttention([original], settings, NOW);

    expect(item?.request).toBe(original);
  });

  it("gives every reason a readable message", () => {
    const everything = request({
      status: "waiting",
      priority: "high",
      assigneeId: null,
      dueDate: "2026-11-05",
      statusChangedAt: "2026-10-20T09:00:00Z",
    });

    for (const reason of evaluateAttention(everything, settings, NOW)) {
      expect(reason.message.length).toBeGreaterThan(5);
    }
  });
});

describe("demo data", () => {
  it("triggers every attention rule", () => {
    const plan = buildSeedPlan(NOW);
    const candidates: AttentionCandidate[] = plan.requests.map((item) => ({
      id: item.key,
      title: item.title,
      status: item.status,
      priority: item.priority,
      assigneeId: item.assigneeKey,
      dueDate: item.dueDate,
      statusChangedAt: item.statusChangedAt,
      archivedAt: null,
    }));

    const items = findNeedsAttention(candidates, settings, NOW);

    for (const rule of ATTENTION_RULES) {
      const matching = items.filter((item) => item.reasons.some((reason) => reason.rule === rule));
      expect(matching.length).toBeGreaterThanOrEqual(2);
    }
  });
});
