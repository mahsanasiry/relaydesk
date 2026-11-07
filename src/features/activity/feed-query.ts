import { isUuid } from "@/lib/utils/uuid";
import { ACTIVITY_TYPES, activityCategory, isActivityFilter } from "./model";
import type { ActivityFilter, ActivityType } from "./model";

export const FEED_PAGE_SIZE = 30;

/** The activity page is addressed by its URL: what to show, whose actions, and which page. */
export interface ActivityFeedQuery {
  filter: ActivityFilter;
  actorId: string | null;
  page: number;
}

export const DEFAULT_FEED_QUERY: ActivityFeedQuery = {
  filter: "all",
  actorId: null,
  page: 1,
};

export function parseFeedQuery(source: { get(name: string): string | null }): ActivityFeedQuery {
  const type = source.get("type")?.trim().toLowerCase() ?? "";
  const actor = source.get("actor")?.trim() ?? "";
  const page = Number(source.get("page") ?? "1");

  return {
    filter: isActivityFilter(type) ? type : "all",
    actorId: isUuid(actor) ? actor.toLowerCase() : null,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** The canonical query string. Defaults are left out so one state has one URL. */
export function serializeFeedQuery(query: ActivityFeedQuery): string {
  const params = new URLSearchParams();
  if (query.filter !== "all") params.set("type", query.filter);
  if (query.actorId !== null) params.set("actor", query.actorId);
  if (query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

/** Changing what is shown starts again from the first page. */
export function withFeedFilters(
  query: ActivityFeedQuery,
  changes: Partial<Pick<ActivityFeedQuery, "filter" | "actorId">>,
): ActivityFeedQuery {
  return { ...query, ...changes, page: 1 };
}

export function typesForFilter(filter: ActivityFilter): readonly ActivityType[] | null {
  if (filter === "all") return null;
  return ACTIVITY_TYPES.filter((type) => activityCategory(type) === filter);
}

/** Inclusive row range for a page, as PostgREST expects it. */
export function feedRange(page: number): { from: number; to: number } {
  const from = (page - 1) * FEED_PAGE_SIZE;
  return { from, to: from + FEED_PAGE_SIZE - 1 };
}

export function feedPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / FEED_PAGE_SIZE));
}
