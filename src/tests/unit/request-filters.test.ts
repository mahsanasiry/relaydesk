import { describe, expect, it } from "vitest";
import {
  DEFAULT_REQUEST_QUERY,
  PAGE_SIZE,
  filterRequests,
  hasActiveFilters,
  normalizeQueryString,
  paginate,
  parseRequestQuery,
  selectRequests,
  serializeRequestQuery,
  sortRequests,
  withFilters,
  withPage,
} from "@/features/requests/filters";
import type { FilterableRequest, RequestQuery } from "@/features/requests/filters";

const NOW = new Date("2026-11-04T10:00:00Z");
const ME = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const PROJECT = "00000000-0000-4000-8000-0000000000aa";
const context = { currentUserId: ME, now: NOW };

function request(overrides: Partial<FilterableRequest> = {}): FilterableRequest {
  return {
    id: "r1",
    title: "A request",
    status: "in_progress",
    priority: "medium",
    assigneeId: OTHER,
    projectId: null,
    dueDate: null,
    blockedReason: null,
    updatedAt: "2026-11-03T09:00:00Z",
    archivedAt: null,
    ...overrides,
  };
}

function query(overrides: Partial<RequestQuery> = {}): RequestQuery {
  return { ...DEFAULT_REQUEST_QUERY, ...overrides };
}

function ids(requests: FilterableRequest[]): string[] {
  return requests.map((item) => item.id);
}

describe("parseRequestQuery", () => {
  it("returns the defaults for an empty query", () => {
    expect(parseRequestQuery(new URLSearchParams(""))).toEqual(DEFAULT_REQUEST_QUERY);
  });

  it("reads the example link from the brief", () => {
    const parsed = parseRequestQuery(new URLSearchParams("status=blocked&priority=high"));

    expect(parsed.statuses).toEqual(["blocked"]);
    expect(parsed.priorities).toEqual(["high"]);
  });

  it("reads the preset views", () => {
    expect(parseRequestQuery(new URLSearchParams("status=open&assignee=me"))).toEqual(
      query({ statuses: ["new", "in_progress", "waiting", "blocked"], assignee: "me" }),
    );
    expect(parseRequestQuery(new URLSearchParams("status=open&priority=high"))).toEqual(
      query({
        statuses: ["new", "in_progress", "waiting", "blocked"],
        priorities: ["high"],
      }),
    );
    expect(
      parseRequestQuery(new URLSearchParams("status=blocked&reason=waiting_for_client")),
    ).toEqual(query({ statuses: ["blocked"], blockedReason: "waiting_for_client" }));
    expect(parseRequestQuery(new URLSearchParams("due=overdue"))).toEqual(
      query({ overdueOnly: true }),
    );
  });

  it("reads lists, repeated parameters and any letter case", () => {
    const parsed = parseRequestQuery(
      new URLSearchParams("status=Waiting,NEW&status=done&priority=low%2Chigh"),
    );

    expect(parsed.statuses).toEqual(["new", "waiting", "done"]);
    expect(parsed.priorities).toEqual(["low", "high"]);
  });

  it("accepts plain objects such as page search params", () => {
    const parsed = parseRequestQuery({ status: ["blocked", "waiting"], q: "map", page: "3" });

    expect(parsed.statuses).toEqual(["waiting", "blocked"]);
    expect(parsed.search).toBe("map");
    expect(parsed.page).toBe(3);
  });

  it("drops values it does not recognise", () => {
    const parsed = parseRequestQuery(
      new URLSearchParams(
        "status=nope&priority=urgent&assignee=bob&project=1&reason=boredom&due=soon&sort=random&page=-4",
      ),
    );

    expect(parsed).toEqual(DEFAULT_REQUEST_QUERY);
  });

  it("keeps member and project ids and the two special assignees", () => {
    const parsed = parseRequestQuery(new URLSearchParams(`assignee=${OTHER}&project=${PROJECT}`));
    const unassigned = parseRequestQuery(new URLSearchParams("assignee=unassigned"));

    expect(parsed.assignee).toBe(OTHER);
    expect(parsed.projectId).toBe(PROJECT);
    expect(unassigned.assignee).toBe("unassigned");
  });

  it("limits the length of the search text and the page number", () => {
    const parsed = parseRequestQuery(new URLSearchParams(`q=${"a".repeat(500)}&page=99999999`));

    expect(parsed.search).toHaveLength(200);
    expect(parsed.page).toBe(10_000);
  });
});

describe("serializeRequestQuery", () => {
  it("leaves out everything that is at its default", () => {
    expect(serializeRequestQuery(DEFAULT_REQUEST_QUERY)).toBe("");
  });

  it("writes a fixed parameter order with readable commas", () => {
    const text = serializeRequestQuery(
      query({
        search: "map provider",
        statuses: ["waiting", "blocked"],
        priorities: ["high"],
        assignee: "me",
        overdueOnly: true,
        sort: "due",
        page: 2,
      }),
    );

    expect(text).toBe(
      "q=map%20provider&status=waiting,blocked&priority=high&assignee=me&due=overdue&sort=due&page=2",
    );
  });

  it("writes all open statuses as open", () => {
    const text = serializeRequestQuery(
      query({ statuses: ["new", "in_progress", "waiting", "blocked"] }),
    );

    expect(text).toBe("status=open");
  });

  it("round-trips any query", () => {
    const original = query({
      search: "Tomás & co / 50%",
      statuses: ["new", "done"],
      priorities: ["low", "medium"],
      assignee: OTHER,
      projectId: PROJECT,
      blockedReason: "technical_problem",
      overdueOnly: true,
      sort: "due",
      page: 4,
    });

    expect(parseRequestQuery(new URLSearchParams(serializeRequestQuery(original)))).toEqual(
      original,
    );
  });
});

describe("normalizeQueryString", () => {
  it("treats differently written queries for the same view as equal", () => {
    expect(normalizeQueryString("priority=high&status=waiting,new")).toBe(
      normalizeQueryString("status=new,waiting&priority=high&junk=1"),
    );
  });

  it("returns an empty string for an empty view", () => {
    expect(normalizeQueryString("")).toBe("");
  });
});

describe("hasActiveFilters", () => {
  it("is false for the defaults, even with a different sort or page", () => {
    expect(hasActiveFilters(DEFAULT_REQUEST_QUERY)).toBe(false);
    expect(hasActiveFilters(query({ sort: "due", page: 3 }))).toBe(false);
  });

  it("is true when any filter is set", () => {
    expect(hasActiveFilters(query({ search: "x" }))).toBe(true);
    expect(hasActiveFilters(query({ statuses: ["done"] }))).toBe(true);
    expect(hasActiveFilters(query({ overdueOnly: true }))).toBe(true);
  });
});

describe("withFilters and withPage", () => {
  it("goes back to the first page when a filter changes", () => {
    const next = withFilters(query({ page: 4 }), { priorities: ["high"] });

    expect(next.page).toBe(1);
    expect(next.priorities).toEqual(["high"]);
  });

  it("never goes below the first page", () => {
    expect(withPage(query(), 0).page).toBe(1);
    expect(withPage(query(), 3.7).page).toBe(3);
  });
});

describe("filterRequests", () => {
  it("never returns archived requests", () => {
    const requests = [
      request({ id: "a", archivedAt: "2026-10-01T00:00:00Z" }),
      request({ id: "b" }),
    ];

    expect(ids(filterRequests(requests, query(), context))).toEqual(["b"]);
  });

  it("searches titles ignoring case and accents, with every word required", () => {
    const requests = [
      request({ id: "a", title: "Choose between map providers" }),
      request({ id: "b", title: "Tomás reviews the maps" }),
      request({ id: "c", title: "Fix header" }),
    ];

    expect(ids(filterRequests(requests, query({ search: "MAP" }), context))).toEqual(["a", "b"]);
    expect(ids(filterRequests(requests, query({ search: "tomas" }), context))).toEqual(["b"]);
    expect(ids(filterRequests(requests, query({ search: "map providers" }), context))).toEqual([
      "a",
    ]);
    expect(ids(filterRequests(requests, query({ search: "providers map" }), context))).toEqual([
      "a",
    ]);
  });

  it("filters by status and priority, each matching any of the chosen values", () => {
    const requests = [
      request({ id: "a", status: "new", priority: "high" }),
      request({ id: "b", status: "waiting", priority: "low" }),
      request({ id: "c", status: "done", priority: "high" }),
    ];

    expect(ids(filterRequests(requests, query({ statuses: ["new", "waiting"] }), context))).toEqual(
      ["a", "b"],
    );
    expect(ids(filterRequests(requests, query({ priorities: ["high"] }), context))).toEqual([
      "a",
      "c",
    ]);
    expect(
      ids(
        filterRequests(
          requests,
          query({ statuses: ["new", "done"], priorities: ["high"] }),
          context,
        ),
      ),
    ).toEqual(["a", "c"]);
  });

  it("filters by assignee: me, nobody, or a member", () => {
    const requests = [
      request({ id: "mine", assigneeId: ME }),
      request({ id: "theirs", assigneeId: OTHER }),
      request({ id: "nobody", assigneeId: null }),
    ];

    expect(ids(filterRequests(requests, query({ assignee: "me" }), context))).toEqual(["mine"]);
    expect(ids(filterRequests(requests, query({ assignee: "unassigned" }), context))).toEqual([
      "nobody",
    ]);
    expect(ids(filterRequests(requests, query({ assignee: OTHER }), context))).toEqual(["theirs"]);
  });

  it("filters by project", () => {
    const requests = [request({ id: "a", projectId: PROJECT }), request({ id: "b" })];

    expect(ids(filterRequests(requests, query({ projectId: PROJECT }), context))).toEqual(["a"]);
  });

  it("filters by blocked reason", () => {
    const requests = [
      request({ id: "a", status: "blocked", blockedReason: "waiting_for_client" }),
      request({ id: "b", status: "blocked", blockedReason: "technical_problem" }),
      request({ id: "c" }),
    ];

    expect(
      ids(filterRequests(requests, query({ blockedReason: "waiting_for_client" }), context)),
    ).toEqual(["a"]);
  });

  it("filters overdue work and ignores finished requests", () => {
    const requests = [
      request({ id: "late", dueDate: "2026-11-01" }),
      request({ id: "today", dueDate: "2026-11-04" }),
      request({ id: "finished", dueDate: "2026-10-01", status: "done" }),
      request({ id: "none" }),
    ];

    expect(ids(filterRequests(requests, query({ overdueOnly: true }), context))).toEqual(["late"]);
  });
});

describe("sortRequests", () => {
  it("puts the most recently updated first by default", () => {
    const requests = [
      request({ id: "old", updatedAt: "2026-10-01T00:00:00Z" }),
      request({ id: "new", updatedAt: "2026-11-03T00:00:00Z" }),
      request({ id: "mid", updatedAt: "2026-10-20T00:00:00Z" }),
    ];

    expect(ids(sortRequests(requests, "updated"))).toEqual(["new", "mid", "old"]);
  });

  it("compares timestamps rather than text, so offsets do not matter", () => {
    const requests = [
      request({ id: "a", updatedAt: "2026-11-03T10:00:00+00:00" }),
      request({ id: "b", updatedAt: "2026-11-03T12:00:00+03:00" }),
    ];

    expect(ids(sortRequests(requests, "updated"))).toEqual(["a", "b"]);
  });

  it("puts the earliest due date first and requests without one last", () => {
    const requests = [
      request({ id: "none", dueDate: null }),
      request({ id: "later", dueDate: "2026-12-01" }),
      request({ id: "sooner", dueDate: "2026-11-10" }),
    ];

    expect(ids(sortRequests(requests, "due"))).toEqual(["sooner", "later", "none"]);
  });

  it("breaks due date ties by last update", () => {
    const requests = [
      request({ id: "a", dueDate: "2026-11-10", updatedAt: "2026-10-01T00:00:00Z" }),
      request({ id: "b", dueDate: "2026-11-10", updatedAt: "2026-11-01T00:00:00Z" }),
    ];

    expect(ids(sortRequests(requests, "due"))).toEqual(["b", "a"]);
  });

  it("does not change the list it is given", () => {
    const requests = [
      request({ id: "a", dueDate: "2026-12-01" }),
      request({ id: "b", dueDate: null }),
    ];
    const copy = [...requests];

    sortRequests(requests, "due");

    expect(requests).toEqual(copy);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 45 }, (_, index) => index);

  it("returns one page of items with the totals", () => {
    const page = paginate(items, 2);

    expect(page.items).toHaveLength(PAGE_SIZE);
    expect(page.items[0]).toBe(20);
    expect(page.page).toBe(2);
    expect(page.pageCount).toBe(3);
    expect(page.total).toBe(45);
  });

  it("returns a shorter last page", () => {
    expect(paginate(items, 3).items).toHaveLength(5);
  });

  it("stays inside the available pages", () => {
    expect(paginate(items, 99).page).toBe(3);
    expect(paginate(items, 0).page).toBe(1);
  });

  it("has one empty page when there are no items", () => {
    const page = paginate([], 1);

    expect(page.items).toEqual([]);
    expect(page.pageCount).toBe(1);
    expect(page.total).toBe(0);
  });
});

describe("selectRequests", () => {
  it("filters, sorts and paginates together", () => {
    const requests = Array.from({ length: 30 }, (_, index) =>
      request({
        id: `r${String(index).padStart(2, "0")}`,
        priority: index % 2 === 0 ? "high" : "low",
        updatedAt: new Date(Date.UTC(2026, 9, 1 + index)).toISOString(),
      }),
    );

    const page = selectRequests(requests, query({ priorities: ["high"], page: 2 }), context);

    expect(page.total).toBe(15);
    expect(page.pageCount).toBe(1);
    expect(page.page).toBe(1);
    expect(page.items[0]?.id).toBe("r28");
  });
});
