import { describe, expect, it } from "vitest";
import { mapActivityRecords } from "@/features/activity/api";
import { FORMER_MEMBER, actorName, describeActivityAction } from "@/features/activity/describe";
import { activityCategory, filterActivity } from "@/features/activity/model";
import type { ActivityType } from "@/features/activity/model";

function action(type: ActivityType, metadata: Record<string, unknown> = {}) {
  return describeActivityAction({ type, metadata });
}

describe("describeActivityAction", () => {
  it("describes a new request with its starting status and priority", () => {
    expect(action("request_created", { status: "new", priority: "high" })).toBe(
      "created the request (New, high priority)",
    );
    expect(action("request_created")).toBe("created the request");
  });

  it("describes a status change", () => {
    expect(action("status_changed", { from: "new", to: "in_progress" })).toBe(
      "changed the status from New to In progress",
    );
  });

  it("adds the reason and note when the new status is Blocked", () => {
    expect(
      action("status_changed", {
        from: "in_progress",
        to: "blocked",
        blocked_reason: "technical_problem",
        blocked_note: "Vendor outage",
      }),
    ).toBe("changed the status from In progress to Blocked (Technical problem: Vendor outage)");
    expect(
      action("status_changed", {
        from: "waiting",
        to: "blocked",
        blocked_reason: "waiting_for_client",
      }),
    ).toBe("changed the status from Waiting to Blocked (Waiting for client)");
  });

  it("describes a change of blocked reason", () => {
    expect(
      action("blocked_reason_changed", {
        from: "technical_problem",
        to: "dependency_on_other_work",
      }),
    ).toBe("changed the blocked reason from Technical problem to Dependency on other work");
  });

  it("describes assignment, unassignment and reassignment", () => {
    expect(action("assignee_changed", { from: null, to: "Maya Okafor" })).toBe(
      "assigned the request to Maya Okafor",
    );
    expect(action("assignee_changed", { from: "Maya Okafor", to: null })).toBe(
      "unassigned the request (was Maya Okafor)",
    );
    expect(action("assignee_changed", { from: "Maya Okafor", to: "Priya Raman" })).toBe(
      "reassigned the request from Maya Okafor to Priya Raman",
    );
  });

  it("describes priority and due date changes", () => {
    expect(action("priority_changed", { from: "low", to: "high" })).toBe(
      "changed the priority from Low to High",
    );
    expect(action("due_date_changed", { from: null, to: "2026-11-09" })).toBe(
      "set the due date to 2026-11-09",
    );
    expect(action("due_date_changed", { from: "2026-11-09", to: null })).toBe(
      "removed the due date (was 2026-11-09)",
    );
    expect(action("due_date_changed", { from: "2026-11-09", to: "2026-11-12" })).toBe(
      "moved the due date from 2026-11-09 to 2026-11-12",
    );
  });

  it("describes lifecycle events and comments", () => {
    expect(action("request_archived")).toBe("archived the request");
    expect(action("request_unarchived")).toBe("restored the request from the archive");
    expect(action("request_deleted")).toBe("deleted the request");
    expect(action("comment_added", { comment_id: "c1" })).toBe("added a comment");
  });

  it("shows an unfamiliar value as it is instead of failing", () => {
    expect(action("priority_changed", { from: "low", to: "urgent" })).toBe(
      "changed the priority from Low to urgent",
    );
  });
});

describe("actorName", () => {
  const names = new Map([["m1", "Maya Okafor"]]);

  it("uses the member's name", () => {
    expect(actorName("m1", names)).toBe("Maya Okafor");
  });

  it("falls back for a removed or unknown person", () => {
    expect(actorName(null, names)).toBe(FORMER_MEMBER);
    expect(actorName("gone", names)).toBe(FORMER_MEMBER);
  });
});

describe("activity filters", () => {
  const events = (
    ["status_changed", "blocked_reason_changed", "comment_added", "assignee_changed"] as const
  ).map((type) => ({ type }));

  it("groups related event types", () => {
    expect(activityCategory("status_changed")).toBe("status");
    expect(activityCategory("blocked_reason_changed")).toBe("status");
    expect(activityCategory("request_deleted")).toBe("lifecycle");
  });

  it("keeps everything for 'all' and one category otherwise", () => {
    expect(filterActivity(events, "all")).toHaveLength(4);
    expect(filterActivity(events, "status")).toHaveLength(2);
    expect(filterActivity(events, "comments")).toEqual([{ type: "comment_added" }]);
    expect(filterActivity(events, "priority")).toEqual([]);
  });
});

describe("mapActivityRecords", () => {
  it("renames columns and drops event types this version does not know", () => {
    const events = mapActivityRecords([
      {
        id: "e1",
        request_id: "r1",
        request_title: "Fix login",
        actor_id: "m1",
        type: "priority_changed",
        metadata: { from: "low", to: "high" },
        created_at: "2026-11-04T10:00:00Z",
      },
      {
        id: "e2",
        request_id: null,
        request_title: "Old",
        actor_id: null,
        type: "something_new",
        metadata: null,
        created_at: "2026-11-04T11:00:00Z",
      },
    ]);

    expect(events).toEqual([
      {
        id: "e1",
        requestId: "r1",
        requestTitle: "Fix login",
        actorId: "m1",
        type: "priority_changed",
        metadata: { from: "low", to: "high" },
        createdAt: "2026-11-04T10:00:00Z",
      },
    ]);
  });
});
