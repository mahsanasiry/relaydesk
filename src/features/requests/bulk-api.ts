import type { SupabaseClient } from "@supabase/supabase-js";
import type { BulkPatch } from "./bulk";

/** Applies one patch to every id in a single statement, so it either succeeds for all or none. */
export async function bulkUpdateRequests(
  client: SupabaseClient,
  ids: readonly string[],
  patch: BulkPatch,
): Promise<number> {
  if (ids.length === 0) return 0;
  const { data, error } = await client
    .from("requests")
    .update(patch)
    .in("id", [...ids])
    .select("id");
  if (error) {
    throw new Error("Could not update the requests.", { cause: error });
  }
  // Row level security hides rows from other workspaces by matching nothing, not by failing.
  return data?.length ?? 0;
}
