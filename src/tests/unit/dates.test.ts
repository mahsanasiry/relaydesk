import { describe, expect, it } from "vitest";
import { differenceInCalendarDays, formatDateOnly, parseDateOnly } from "@/lib/utils/dates";

describe("differenceInCalendarDays", () => {
  it("returns zero for two moments on the same UTC day", () => {
    const morning = new Date("2026-03-10T00:30:00Z");
    const evening = new Date("2026-03-10T23:30:00Z");

    expect(differenceInCalendarDays(evening, morning)).toBe(0);
  });

  it("counts calendar days, not elapsed 24-hour periods", () => {
    const lateEvening = new Date("2026-03-10T23:59:00Z");
    const earlyMorning = new Date("2026-03-11T00:01:00Z");

    expect(differenceInCalendarDays(earlyMorning, lateEvening)).toBe(1);
  });

  it("is negative when the first date is earlier", () => {
    const earlier = new Date("2026-03-01T12:00:00Z");
    const later = new Date("2026-03-04T12:00:00Z");

    expect(differenceInCalendarDays(earlier, later)).toBe(-3);
  });

  it("handles month and year boundaries", () => {
    const newYear = new Date("2027-01-02T00:00:00Z");
    const yearEnd = new Date("2026-12-30T00:00:00Z");

    expect(differenceInCalendarDays(newYear, yearEnd)).toBe(3);
  });
});

describe("parseDateOnly and formatDateOnly", () => {
  it("read a plain date as midnight UTC", () => {
    expect(parseDateOnly("2026-11-04").toISOString()).toBe("2026-11-04T00:00:00.000Z");
  });

  it("write the UTC day of a date", () => {
    expect(formatDateOnly(new Date("2026-11-04T23:59:00Z"))).toBe("2026-11-04");
  });

  it("round-trip a date", () => {
    expect(formatDateOnly(parseDateOnly("2027-02-28"))).toBe("2027-02-28");
  });
});
