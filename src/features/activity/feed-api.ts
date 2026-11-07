import type { SupabaseClient } from "@supabase/supabase-js";
import { COLUMNS, mapActivityRecords } from "./api";
import type { ActivityRecord } from "./api";
import { feedRange, typesForFilter } from "./feed-query";
import type { ActivityFeedQuery } from "./feed-query";
import type { ActivityEvent } from "./model";

export interface ActivityFeedPage {
  events: ActivityEvent[];
  total: number;
}

export async function fetchActivityFeed(
  client: SupabaseClient,
  query: ActivityFeedQuery,
): Promise<ActivityFeedPage> {
  let request = client.from("activity_events").select(COLUMNS, { count: "exact" });

  const types = typesForFilter(query.filter);
  if (types !== null) request = request.in("type", [...types]);
  if (query.actorId !== null) request = request.eq("actor_id", query.actorId);

  const { from, to } = feedRange(query.page);
  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    // The id breaks ties so events cannot move between pages while paging.
    .order("id")
    .range(from, to);
  // A page past the end is not a failure: the view tells the person and links back.
  if (error?.code === "PGRST103") {
    return { events: [], total: 0 };
  }
  if (error) {
    throw new Error("Could not load the activity.", { cause: error });
  }
  return {
    events: mapActivityRecords((data ?? []) as unknown as ActivityRecord[]),
    total: count ?? 0,
  };
}
