import { describe, expect, it, vi } from "vitest";
import {
  buildBulkPatch,
  describeBulkResult,
  toggleId,
  togglePage,
  visibleSelection,
} from "@/features/requests/bulk";
import { bulkUpdateRequests } from "@/features/requests/bulk-api";

const NOW = new Date("2026-11-04T10:00:00Z");

describe("buildBulkPatch", () => {
  it("clears the blocked fields for any status but Blocked", () => {
    expect(
      buildBulkPatch(
        {
          kind: "status",
          status: "done",
          blockedReason: "technical_problem",
          blockedNote: "x",
        },
        NOW,
      ),
    ).toEqual({
      ok: true,
      patch: { status: "done", blocked_reason: null, blocked_note: null },
    });
  });

  it("requires a reason for Blocked and trims the note", () => {
    expect(
      buildBulkPatch(
        {
          kind: "status",
          status: "blocked",
          blockedReason: null,
          blockedNote: "",
        },
        NOW,
      ),
    ).toEqual({ ok: false, message: "Choose why this request is blocked." });
    expect(
      buildBulkPatch(
        {
          kind: "status",
          status: "blocked",
          blockedReason: "waiting_for_client",
          blockedNote: "  call back  ",
        },
        NOW,
      ),
    ).toEqual({
      ok: true,
      patch: {
        status: "blocked",
        blocked_reason: "waiting_for_client",
        blocked_note: "call back",
      },
    });
  });

  it("builds priority, assignee and archive patches", () => {
    expect(buildBulkPatch({ kind: "priority", priority: "high" }, NOW)).toEqual({
      ok: true,
      patch: { priority: "high" },
    });
    expect(buildBulkPatch({ kind: "assignee", assigneeId: null }, NOW)).toEqual({
      ok: true,
      patch: { assignee_id: null },
    });
    expect(buildBulkPatch({ kind: "archive" }, NOW)).toEqual({
      ok: true,
      patch: { archived_at: "2026-11-04T10:00:00.000Z" },
    });
  });
});

describe("selection helpers", () => {
  it("toggles one id without changing the original set", () => {
    const original = new Set(["a"]);

    expect([...toggleId(original, "b")]).toEqual(["a", "b"]);
    expect([...toggleId(original, "a")]).toEqual([]);
    expect([...original]).toEqual(["a"]);
  });

  it("selects the whole page, or clears it when it was all selected", () => {
    expect([...togglePage(new Set(["a"]), ["a", "b"])].sort()).toEqual(["a", "b"]);
    expect([...togglePage(new Set(["a", "b", "z"]), ["a", "b"])]).toEqual(["z"]);
    expect([...togglePage(new Set(), [])]).toEqual([]);
  });

  it("keeps only ids that are still visible", () => {
    expect([...visibleSelection(new Set(["a", "gone"]), ["a", "b"])]).toEqual(["a"]);
  });
});

describe("describeBulkResult", () => {
  it("words the outcome and flags rows that disappeared", () => {
    expect(describeBulkResult({ kind: "priority", priority: "low" }, 1, 1)).toBe(
      "1 request updated.",
    );
    expect(describeBulkResult({ kind: "archive" }, 3, 3)).toBe("3 requests archived.");
    expect(describeBulkResult({ kind: "archive" }, 2, 3)).toBe(
      "2 of 3 requests were updated. The rest no longer exist.",
    );
  });
});

describe("bulkUpdateRequests", () => {
  function fakeClient(result: { data: unknown; error: unknown }) {
    const select = vi.fn().mockResolvedValue(result);
    const inFilter = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ in: inFilter });
    const from = vi.fn().mockReturnValue({ update });
    return { client: { from } as never, from, update, inFilter };
  }

  it("updates every id in one call and returns how many rows changed", async () => {
    const fake = fakeClient({ data: [{ id: "a" }, { id: "b" }], error: null });

    const count = await bulkUpdateRequests(fake.client, ["a", "b"], {
      priority: "high",
    });

    expect(count).toBe(2);
    expect(fake.from).toHaveBeenCalledWith("requests");
    expect(fake.update).toHaveBeenCalledWith({ priority: "high" });
    expect(fake.inFilter).toHaveBeenCalledWith("id", ["a", "b"]);
  });

  it("does nothing for an empty selection", async () => {
    const fake = fakeClient({ data: [], error: null });

    expect(await bulkUpdateRequests(fake.client, [], { priority: "high" })).toBe(0);
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("wraps a database failure without exposing it", async () => {
    const fake = fakeClient({
      data: null,
      error: { code: "42501", message: "denied" },
    });

    await expect(bulkUpdateRequests(fake.client, ["a"], { priority: "low" })).rejects.toThrow(
      "Could not update the requests.",
    );
  });
});
