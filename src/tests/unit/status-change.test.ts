import { describe, expect, it } from "vitest";
import {
  BLOCKED_NOTE_MAX_LENGTH,
  requiresBlockedReason,
  resolveStatusChange,
} from "@/features/requests/status-change";
import type { StatusState } from "@/features/requests/status-change";

const inProgress: StatusState = { status: "in_progress", blockedReason: null, blockedNote: null };
const blocked: StatusState = {
  status: "blocked",
  blockedReason: "technical_problem",
  blockedNote: "API down",
};

describe("requiresBlockedReason", () => {
  it("is true only for Blocked", () => {
    expect(requiresBlockedReason("blocked")).toBe(true);
    expect(requiresBlockedReason("waiting")).toBe(false);
    expect(requiresBlockedReason("done")).toBe(false);
  });
});

describe("resolveStatusChange to Blocked", () => {
  it("asks for a reason when none is given", () => {
    const result = resolveStatusChange(inProgress, { status: "blocked" });

    expect(result).toEqual({
      ok: false,
      field: "blockedReason",
      message: "Choose why this request is blocked.",
    });
  });

  it("treats an empty or unknown reason as missing", () => {
    expect(resolveStatusChange(inProgress, { status: "blocked", blockedReason: null }).ok).toBe(
      false,
    );
    expect(
      resolveStatusChange(inProgress, {
        status: "blocked",
        blockedReason: "because" as never,
      }).ok,
    ).toBe(false);
  });

  it("keeps the reason and trims the note", () => {
    const result = resolveStatusChange(inProgress, {
      status: "blocked",
      blockedReason: "waiting_for_client",
      blockedNote: "  Sent twice  ",
    });

    expect(result).toEqual({
      ok: true,
      changed: true,
      value: { status: "blocked", blockedReason: "waiting_for_client", blockedNote: "Sent twice" },
    });
  });

  it("stores a blank note as no note", () => {
    const result = resolveStatusChange(inProgress, {
      status: "blocked",
      blockedReason: "technical_problem",
      blockedNote: "   ",
    });

    expect(result.ok && result.value.blockedNote).toBe(null);
  });

  it("rejects a note over the length limit and accepts one at the limit", () => {
    const base = { status: "blocked", blockedReason: "technical_problem" } as const;

    const tooLong = resolveStatusChange(inProgress, {
      ...base,
      blockedNote: "x".repeat(BLOCKED_NOTE_MAX_LENGTH + 1),
    });
    const atLimit = resolveStatusChange(inProgress, {
      ...base,
      blockedNote: "x".repeat(BLOCKED_NOTE_MAX_LENGTH),
    });

    expect(!tooLong.ok && tooLong.field).toBe("blockedNote");
    expect(atLimit.ok).toBe(true);
  });

  it("counts a different reason on an already blocked request as a change", () => {
    const result = resolveStatusChange(blocked, {
      status: "blocked",
      blockedReason: "dependency_on_other_work",
      blockedNote: "API down",
    });

    expect(result.ok && result.changed).toBe(true);
  });

  it("reports no change when the reason and note are the same", () => {
    const result = resolveStatusChange(blocked, {
      status: "blocked",
      blockedReason: "technical_problem",
      blockedNote: "API down",
    });

    expect(result.ok && result.changed).toBe(false);
  });
});

describe("resolveStatusChange away from Blocked", () => {
  it("clears the reason and note", () => {
    const result = resolveStatusChange(blocked, { status: "in_progress" });

    expect(result).toEqual({ ok: true, changed: true, value: inProgress });
  });

  it("ignores a reason that is sent along with another status", () => {
    const result = resolveStatusChange(inProgress, {
      status: "waiting",
      blockedReason: "technical_problem",
      blockedNote: "left over",
    });

    expect(result.ok && result.value).toEqual({
      status: "waiting",
      blockedReason: null,
      blockedNote: null,
    });
  });

  it("reports no change when the status is the same", () => {
    const result = resolveStatusChange(inProgress, { status: "in_progress" });

    expect(result.ok && result.changed).toBe(false);
  });

  it("allows reopening finished work", () => {
    const done: StatusState = { status: "done", blockedReason: null, blockedNote: null };
    const result = resolveStatusChange(done, { status: "in_progress" });

    expect(result.ok && result.changed).toBe(true);
  });
});
