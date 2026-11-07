import type { SupabaseClient } from "@supabase/supabase-js";
import type { SavedView } from "./model";

interface SavedViewRecord {
  id: string;
  name: string;
  query: string;
}

export function mapSavedView(record: SavedViewRecord): SavedView {
  return { id: record.id, name: record.name, query: record.query };
}

export async function fetchSavedViews(client: SupabaseClient): Promise<SavedView[]> {
  // Row level security leaves only the signed-in person's own views.
  const { data, error } = await client
    .from("saved_views")
    .select("id,name,query")
    .order("created_at")
    .order("id");
  if (error) {
    throw new Error("Could not load your saved views.", { cause: error });
  }
  return ((data ?? []) as unknown as SavedViewRecord[]).map(mapSavedView);
}

export async function createSavedView(
  client: SupabaseClient,
  owner: { workspaceId: string; userId: string },
  name: string,
  query: string,
): Promise<void> {
  const { error } = await client.from("saved_views").insert({
    workspace_id: owner.workspaceId,
    user_id: owner.userId,
    name: name.trim(),
    query,
  });
  if (error) {
    throw new Error("Could not save the view.", { cause: error });
  }
}

export async function renameSavedView(
  client: SupabaseClient,
  id: string,
  name: string,
): Promise<void> {
  const { data, error } = await client
    .from("saved_views")
    .update({ name: name.trim() })
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error("Could not rename the view.", { cause: error });
  }
  if (!data || data.length === 0) {
    throw new Error("The view no longer exists.");
  }
}

export async function deleteSavedView(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("saved_views").delete().eq("id", id);
  if (error) {
    throw new Error("Could not delete the view.", { cause: error });
  }
}
