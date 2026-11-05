import { describe, expect, it } from "vitest";
import { daysUntilDue, isOverdue } from "@/features/requests/due";

const NOW = new Date("2026-11-04T10:00:00Z");

describe("daysUntilDue", () => {
  it("counts whole calendar days", () => {
    expect(daysUntilDue("2026-11-04", NOW)).toBe(0);
    expect(daysUntilDue("2026-11-06", NOW)).toBe(2);
    expect(daysUntilDue("2026-11-01", NOW)).toBe(-3);
  });

  it("does not depend on the time of day", () => {
    expect(daysUntilDue("2026-11-05", new Date("2026-11-04T00:01:00Z"))).toBe(1);
    expect(daysUntilDue("2026-11-05", new Date("2026-11-04T23:59:00Z"))).toBe(1);
  });

  it("is null without a due date", () => {
    expect(daysUntilDue(null, NOW)).toBe(null);
  });
});

describe("isOverdue", () => {
  it("is true for open work past its due date", () => {
    expect(isOverdue({ status: "in_progress", dueDate: "2026-11-03" }, NOW)).toBe(true);
  });

  it("is false on the due date itself", () => {
    expect(isOverdue({ status: "in_progress", dueDate: "2026-11-04" }, NOW)).toBe(false);
  });

  it("is false for finished work", () => {
    expect(isOverdue({ status: "done", dueDate: "2026-10-01" }, NOW)).toBe(false);
  });

  it("is false without a due date", () => {
    expect(isOverdue({ status: "new", dueDate: null }, NOW)).toBe(false);
  });
});
