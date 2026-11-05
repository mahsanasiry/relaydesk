import { describe, expect, it } from "vitest";
import { mapRequestDetail } from "@/features/requests/detail-api";
import { toFormValues } from "@/features/requests/payload";
import { isUuid } from "@/lib/utils/uuid";
import { formatTimestamp } from "@/lib/utils/format";

describe("mapRequestDetail and toFormValues", () => {
  const detail = mapRequestDetail({
    id: "r1",
    title: "Fix login",
    description: "Users are locked out.",
    status: "blocked",
    priority: "high",
    assignee_id: null,
    project_id: "p1",
    client_id: "c1",
    due_date: "2026-11-09",
    labels: ["auth", "urgent"],
    blocked_reason: "technical_problem",
    blocked_note: "Waiting on a vendor fix",
    status_changed_at: "2026-11-01T09:00:00Z",
    updated_at: "2026-11-02T09:00:00Z",
    created_at: "2026-10-20T09:00:00Z",
    archived_at: null,
    created_by: "m1",
  });

  it("adds the long-form fields to the list row", () => {
    expect(detail).toMatchObject({
      id: "r1",
      assigneeId: null,
      description: "Users are locked out.",
      labels: ["auth", "urgent"],
      blockedNote: "Waiting on a vendor fix",
      createdAt: "2026-10-20T09:00:00Z",
      createdBy: "m1",
    });
  });

  it("fills the form with text, using empty strings for missing values", () => {
    expect(toFormValues(detail)).toEqual({
      title: "Fix login",
      description: "Users are locked out.",
      status: "blocked",
      priority: "high",
      assigneeId: "",
      projectId: "p1",
      dueDate: "2026-11-09",
      labels: "auth, urgent",
      blockedReason: "technical_problem",
      blockedNote: "Waiting on a vendor fix",
    });
  });
});

describe("isUuid", () => {
  it("accepts a uuid and rejects anything else", () => {
    expect(isUuid("3f2b8f0e-7c1a-4b7e-9d5a-1a2b3c4d5e6f")).toBe(true);
    expect(isUuid("new")).toBe(false);
    expect(isUuid("3f2b8f0e-7c1a-4b7e-9d5a-1a2b3c4d5e6f/extra")).toBe(false);
  });
});

describe("formatTimestamp", () => {
  it("renders a fixed, zone-independent text", () => {
    expect(formatTimestamp("2026-11-04T10:05:30Z")).toBe("2026-11-04 10:05 UTC");
  });

  it("returns unreadable input unchanged", () => {
    expect(formatTimestamp("not a date")).toBe("not a date");
  });
});
