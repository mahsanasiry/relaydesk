import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttentionSettings } from "./attention";

interface SettingsRecord {
  waiting_threshold_days: number;
  due_window_days: number;
}

export function mapSettings(record: SettingsRecord): AttentionSettings {
  return {
    waitingThresholdDays: record.waiting_threshold_days,
    dueWindowDays: record.due_window_days,
  };
}

export async function fetchWorkspaceSettings(client: SupabaseClient): Promise<AttentionSettings> {
  // Row level security leaves the signed-in user's own workspace as the only visible row.
  const { data, error } = await client
    .from("workspaces")
    .select("waiting_threshold_days,due_window_days")
    .maybeSingle();
  if (error || !data) {
    throw new Error("Could not load the workspace settings.", { cause: error });
  }
  return mapSettings(data as unknown as SettingsRecord);
}
