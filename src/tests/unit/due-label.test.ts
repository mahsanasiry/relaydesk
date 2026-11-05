import { describe, expect, it } from "vitest";
import { describeDue } from "@/features/requests/due-label";

const NOW = new Date("2026-11-04T10:00:00Z");

describe("describeDue", () => {
  it("says by how much open work is late", () => {
    expect(describeDue("2026-11-03", "in_progress", NOW)).toEqual({
      date: "2026-11-03",
      note: "Overdue by 1 day",
      overdue: true,
    });
    expect(describeDue("2026-10-30", "blocked", NOW).note).toBe("Overdue by 5 days");
  });

  it("does not call work due today late", () => {
    expect(describeDue("2026-11-04", "new", NOW)).toEqual({
      date: "2026-11-04",
      note: "Due today",
      overdue: false,
    });
  });

  it("counts the days still left", () => {
    expect(describeDue("2026-11-05", "waiting", NOW).note).toBe("Due in 1 day");
    expect(describeDue("2026-11-09", "waiting", NOW).note).toBe("Due in 5 days");
  });

  it("never marks finished work as late", () => {
    expect(describeDue("2026-10-01", "done", NOW)).toEqual({
      date: "2026-10-01",
      note: null,
      overdue: false,
    });
  });

  it("handles a missing date", () => {
    expect(describeDue(null, "new", NOW)).toEqual({ date: null, note: null, overdue: false });
  });
});
