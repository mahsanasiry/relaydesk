import { describe, expect, it } from "vitest";
import { fetchActivityFeed } from "@/features/activity/feed-api";
import {
  FEED_PAGE_SIZE,
  feedPageCount,
  feedRange,
  parseFeedQuery,
  serializeFeedQuery,
  typesForFilter,
  withFeedFilters,
} from "@/features/activity/feed-query";

const ACTOR = "11111111-1111-4111-8111-111111111111";

describe("parseFeedQuery", () => {
  it("reads the filter, person and page", () => {
    expect(parseFeedQuery(new URLSearchParams(`type=comments&actor=${ACTOR}&page=3`))).toEqual({
      filter: "comments",
      actorId: ACTOR,
      page: 3,
    });
  });

  it("falls back to defaults for anything unusable", () => {
    expect(parseFeedQuery(new URLSearchParams("type=nope&actor=abc&page=0"))).toEqual({
      filter: "all",
      actorId: null,
      page: 1,
    });
    expect(parseFeedQuery(new URLSearchParams("page=1.5")).page).toBe(1);
    expect(parseFeedQuery(new URLSearchParams("page=-2")).page).toBe(1);
  });
});

describe("serializeFeedQuery", () => {
  it("leaves out defaults so one state has one URL", () => {
    expect(serializeFeedQuery({ filter: "all", actorId: null, page: 1 })).toBe("");
    expect(serializeFeedQuery({ filter: "status", actorId: ACTOR, page: 2 })).toBe(
      `type=status&actor=${ACTOR}&page=2`,
    );
  });

  it("round-trips through parse", () => {
    const query = { filter: "priority" as const, actorId: ACTOR, page: 4 };

    expect(parseFeedQuery(new URLSearchParams(serializeFeedQuery(query)))).toEqual(query);
  });
});

describe("feed helpers", () => {
  it("returns to the first page when a filter changes", () => {
    expect(
      withFeedFilters({ filter: "all", actorId: null, page: 5 }, { filter: "status" }),
    ).toEqual({ filter: "status", actorId: null, page: 1 });
  });

  it("maps a filter to the event types it covers", () => {
    expect(typesForFilter("all")).toBeNull();
    expect(typesForFilter("status")).toEqual(["status_changed", "blocked_reason_changed"]);
    expect(typesForFilter("comments")).toEqual(["comment_added"]);
  });

  it("computes row ranges and page counts", () => {
    expect(feedRange(1)).toEqual({ from: 0, to: FEED_PAGE_SIZE - 1 });
    expect(feedRange(3)).toEqual({
      from: 2 * FEED_PAGE_SIZE,
      to: 3 * FEED_PAGE_SIZE - 1,
    });
    expect(feedPageCount(0)).toBe(1);
    expect(feedPageCount(FEED_PAGE_SIZE)).toBe(1);
    expect(feedPageCount(FEED_PAGE_SIZE + 1)).toBe(2);
  });
});

describe("fetchActivityFeed", () => {
  function fakeClient(result: Record<string, unknown>) {
    const calls: Array<[string, unknown[]]> = [];
    const chain: Record<string, unknown> = {};
    for (const name of ["select", "in", "eq", "order"]) {
      chain[name] = (...args: unknown[]) => {
        calls.push([name, args]);
        return chain;
      };
    }
    chain.range = (...args: unknown[]) => {
      calls.push(["range", args]);
      return Promise.resolve(result);
    };
    return { client: { from: () => chain } as never, calls };
  }

  it("applies the filters, the order and the page range", async () => {
    const fake = fakeClient({ data: [], error: null, count: 0 });

    await fetchActivityFeed(fake.client, {
      filter: "comments",
      actorId: ACTOR,
      page: 2,
    });

    expect(fake.calls).toContainEqual(["in", ["type", ["comment_added"]]]);
    expect(fake.calls).toContainEqual(["eq", ["actor_id", ACTOR]]);
    expect(fake.calls).toContainEqual(["range", [FEED_PAGE_SIZE, 2 * FEED_PAGE_SIZE - 1]]);
  });

  it("maps rows, drops unknown types and reports the total", async () => {
    const fake = fakeClient({
      data: [
        {
          id: "e1",
          request_id: null,
          request_title: "Gone",
          actor_id: null,
          type: "request_deleted",
          metadata: {},
          created_at: "2026-11-04T10:00:00Z",
        },
        {
          id: "e2",
          request_id: null,
          request_title: "Other",
          actor_id: null,
          type: "from_the_future",
          metadata: {},
          created_at: "2026-11-04T10:00:00Z",
        },
      ],
      error: null,
      count: 2,
    });

    const page = await fetchActivityFeed(fake.client, {
      filter: "all",
      actorId: null,
      page: 1,
    });

    expect(page.total).toBe(2);
    expect(page.events.map((event) => event.id)).toEqual(["e1"]);
  });

  it("treats a page past the end as empty, and any other failure as an error", async () => {
    const past = fakeClient({
      data: null,
      error: { code: "PGRST103" },
      count: null,
    });
    expect(
      await fetchActivityFeed(past.client, {
        filter: "all",
        actorId: null,
        page: 9,
      }),
    ).toEqual({ events: [], total: 0 });

    const broken = fakeClient({
      data: null,
      error: { code: "42501" },
      count: null,
    });
    await expect(
      fetchActivityFeed(broken.client, {
        filter: "all",
        actorId: null,
        page: 1,
      }),
    ).rejects.toThrow("Could not load the activity.");
  });
});
