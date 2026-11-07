import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileFormValues, WorkspaceFormValues } from "@/lib/validation/settings";

export interface WorkspaceDetails {
  id: string;
  name: string;
  waitingThresholdDays: number;
  dueWindowDays: number;
}

interface WorkspaceRecord {
  id: string;
  name: string;
  waiting_threshold_days: number;
  due_window_days: number;
}

export function mapWorkspace(record: WorkspaceRecord): WorkspaceDetails {
  return {
    id: record.id,
    name: record.name,
    waitingThresholdDays: record.waiting_threshold_days,
    dueWindowDays: record.due_window_days,
  };
}

export function toWorkspaceFormValues(workspace: WorkspaceDetails): WorkspaceFormValues {
  return {
    name: workspace.name,
    waitingThresholdDays: String(workspace.waitingThresholdDays),
    dueWindowDays: String(workspace.dueWindowDays),
  };
}

export function toWorkspaceRecord(values: WorkspaceFormValues) {
  return {
    name: values.name.trim(),
    waiting_threshold_days: Number(values.waitingThresholdDays),
    due_window_days: Number(values.dueWindowDays),
  };
}

export async function fetchWorkspaceDetails(client: SupabaseClient): Promise<WorkspaceDetails> {
  // Row level security leaves the signed-in person's own workspace as the only visible row.
  const { data, error } = await client
    .from("workspaces")
    .select("id,name,waiting_threshold_days,due_window_days")
    .maybeSingle();
  if (error || !data) {
    throw new Error("Could not load the workspace settings.", { cause: error });
  }
  return mapWorkspace(data as unknown as WorkspaceRecord);
}

export async function updateWorkspace(
  client: SupabaseClient,
  id: string,
  values: WorkspaceFormValues,
): Promise<void> {
  const { data, error } = await client
    .from("workspaces")
    .update(toWorkspaceRecord(values))
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error("Could not save the workspace settings.", { cause: error });
  }
  if (!data || data.length === 0) {
    throw new Error("The workspace no longer exists.");
  }
}

export async function updateDisplayName(
  client: SupabaseClient,
  userId: string,
  values: ProfileFormValues,
): Promise<void> {
  const { data, error } = await client
    .from("profiles")
    .update({ display_name: values.displayName.trim() })
    .eq("id", userId)
    .select("id");
  if (error) {
    throw new Error("Could not save your name.", { cause: error });
  }
  if (!data || data.length === 0) {
    throw new Error("Your profile could not be found.");
  }
}
