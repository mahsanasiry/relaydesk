import { describe, expect, it } from "vitest";
import { fetchAllPages, mapRequestRow } from "@/features/requests/api";

describe("mapRequestRow", () => {
  it("converts database column names to the names the app uses", () => {
    expect(
      mapRequestRow({
        id: "r1",
        title: "Fix login",
        status: "blocked",
        priority: "high",
        assignee_id: "m1",
        project_id: "p1",
        client_id: "c1",
        due_date: "2026-11-03",
        blocked_reason: "technical_problem",
        status_changed_at: "2026-11-01T09:00:00Z",
        updated_at: "2026-11-02T09:00:00Z",
        archived_at: null,
      }),
    ).toEqual({
      id: "r1",
      title: "Fix login",
      status: "blocked",
      priority: "high",
      assigneeId: "m1",
      projectId: "p1",
      clientId: "c1",
      dueDate: "2026-11-03",
      blockedReason: "technical_problem",
      statusChangedAt: "2026-11-01T09:00:00Z",
      updatedAt: "2026-11-02T09:00:00Z",
      archivedAt: null,
    });
  });
});

function source(total: number) {
  const calls: [number, number][] = [];
  const fetchPage = async (from: number, to: number) => {
    calls.push([from, to]);
    const items: number[] = [];
    for (let index = from; index <= to && index < total; index += 1) items.push(index);
    return items;
  };
  return { calls, fetchPage };
}

describe("fetchAllPages", () => {
  it("keeps asking until a page comes back short", async () => {
    const { calls, fetchPage } = source(5);

    const rows = await fetchAllPages(fetchPage, 2, 100);

    expect(rows).toEqual([0, 1, 2, 3, 4]);
    expect(calls).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it("makes one extra call when the total is an exact multiple of the page size", async () => {
    const { calls, fetchPage } = source(4);

    const rows = await fetchAllPages(fetchPage, 2, 100);

    expect(rows).toHaveLength(4);
    expect(calls).toHaveLength(3);
  });

  it("stops at the row limit", async () => {
    const { fetchPage } = source(50);

    const rows = await fetchAllPages(fetchPage, 10, 25);

    expect(rows).toHaveLength(25);
  });

  it("returns nothing for an empty source", async () => {
    const { fetchPage } = source(0);

    expect(await fetchAllPages(fetchPage, 10, 25)).toEqual([]);
  });
});
