import { describe, expect, it } from "vitest";
import { mapSettings } from "@/features/dashboard/api";
import { requestsHref } from "@/features/dashboard/links";
import { OPEN_STATUSES } from "@/features/requests/model";

describe("requestsHref", () => {
  it("links to the plain list when nothing is filtered", () => {
    expect(requestsHref()).toBe("/app/requests");
  });

  it("spells all open statuses as the readable 'open'", () => {
    expect(requestsHref({ statuses: [...OPEN_STATUSES] })).toBe("/app/requests?status=open");
  });

  it("combines filters in the canonical order", () => {
    expect(requestsHref({ statuses: [...OPEN_STATUSES], assignee: "me" })).toBe(
      "/app/requests?status=open&assignee=me",
    );
    expect(requestsHref({ statuses: ["blocked"], blockedReason: "technical_problem" })).toBe(
      "/app/requests?status=blocked&reason=technical_problem",
    );
    expect(requestsHref({ overdueOnly: true })).toBe("/app/requests?due=overdue");
  });
});

describe("mapSettings", () => {
  it("renames the workspace columns to the names the attention rules use", () => {
    expect(mapSettings({ waiting_threshold_days: 5, due_window_days: 1 })).toEqual({
      waitingThresholdDays: 5,
      dueWindowDays: 1,
    });
  });
});
