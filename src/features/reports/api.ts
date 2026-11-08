import type { SupabaseClient } from "@supabase/supabase-js";
import { COLUMNS, mapActivityRecords } from "@/features/activity/api";
import type { ActivityRecord } from "@/features/activity/api";
import type { ActivityEvent } from "@/features/activity/model";
import { fetchAllPages } from "@/features/requests/api";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The status and reason changes of the last `days` days, oldest first. */
export async function fetchBlockerHistory(
  client: SupabaseClient,
  days: number,
  now: number = Date.now(),
): Promise<ActivityEvent[]> {
  const since = new Date(now - days * DAY_MS).toISOString();
  const records = await fetchAllPages(async (from, to) => {
    const { data, error } = await client
      .from("activity_events")
      .select(COLUMNS)
      .in("type", ["status_changed", "blocked_reason_changed"])
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      // The id breaks ties so rows cannot move between pages while paging.
      .order("id")
      .range(from, to);
    if (error) {
      throw new Error("Could not load the blocker history.", { cause: error });
    }
    return (data ?? []) as unknown as ActivityRecord[];
  });
  return mapActivityRecords(records);
}
