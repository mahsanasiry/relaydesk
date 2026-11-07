import { describe, expect, it } from "vitest";
import { mapNotifications } from "@/features/notifications/api";
import {
  countUnread,
  describeNotification,
  formatBadgeCount,
} from "@/features/notifications/model";

describe("describeNotification", () => {
  it("says who did what for each kind", () => {
    expect(describeNotification("request_assigned", "Grace Hopper")).toBe(
      "Grace Hopper assigned this request to you.",
    );
    expect(describeNotification("comment_added", "Grace Hopper")).toBe(
      "Grace Hopper commented on this request.",
    );
    expect(describeNotification("request_unblocked", "Grace Hopper")).toBe(
      "Grace Hopper unblocked this request.",
    );
  });

  it("needs no person for a due date", () => {
    expect(describeNotification("due_soon", null)).toBe("This request is due soon.");
  });

  it("falls back when the person is unknown", () => {
    expect(describeNotification("comment_added", null)).toBe("Someone commented on this request.");
  });
});

describe("counts", () => {
  it("counts only unread notifications", () => {
    expect(
      countUnread([{ readAt: null }, { readAt: "2026-11-04T10:00:00Z" }, { readAt: null }]),
    ).toBe(2);
    expect(countUnread([])).toBe(0);
  });

  it("stops the badge at 99", () => {
    expect(formatBadgeCount(7)).toBe("7");
    expect(formatBadgeCount(99)).toBe("99");
    expect(formatBadgeCount(100)).toBe("99+");
  });
});

describe("mapNotifications", () => {
  const record = {
    id: "n1",
    type: "comment_added",
    request_id: "r1",
    actor_id: "a1",
    read_at: null,
    created_at: "2026-11-04T10:00:00Z",
  };

  it("attaches request titles and renames columns", () => {
    expect(mapNotifications([record], new Map([["r1", "Fix login"]]))).toEqual([
      {
        id: "n1",
        type: "comment_added",
        requestId: "r1",
        requestTitle: "Fix login",
        actorId: "a1",
        readAt: null,
        createdAt: "2026-11-04T10:00:00Z",
      },
    ]);
  });

  it("keeps a notification whose request title is not visible", () => {
    expect(mapNotifications([record], new Map())[0]?.requestTitle).toBeNull();
  });

  it("skips types this version does not know", () => {
    expect(mapNotifications([{ ...record, type: "from_the_future" }], new Map())).toEqual([]);
  });
});
