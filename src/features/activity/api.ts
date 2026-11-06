import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVITY_TYPES } from "./model";
import type { ActivityEvent, ActivityType } from "./model";

interface ActivityRecord {
  id: string;
  request_id: string | null;
  request_title: string;
  actor_id: string | null;
  type: string;
  metadata: unknown;
  created_at: string;
}

const COLUMNS = "id,request_id,request_title,actor_id,type,metadata,created_at";
export const REQUEST_ACTIVITY_LIMIT = 200;

function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value);
}

/** Events of a type this version does not know are dropped instead of breaking the page. */
export function mapActivityRecords(records: readonly ActivityRecord[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const record of records) {
    if (!isActivityType(record.type)) continue;
    events.push({
      id: record.id,
      requestId: record.request_id,
      requestTitle: record.request_title,
      actorId: record.actor_id,
      type: record.type,
      metadata:
        typeof record.metadata === "object" && record.metadata !== null
          ? (record.metadata as Record<string, unknown>)
          : {},
      createdAt: record.created_at,
    });
  }
  return events;
}

export async function fetchRequestActivity(
  client: SupabaseClient,
  requestId: string,
): Promise<ActivityEvent[]> {
  const { data, error } = await client
    .from("activity_events")
    .select(COLUMNS)
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .order("id")
    .limit(REQUEST_ACTIVITY_LIMIT);
  if (error) {
    throw new Error("Could not load the activity.", { cause: error });
  }
  return mapActivityRecords((data ?? []) as unknown as ActivityRecord[]);
}
