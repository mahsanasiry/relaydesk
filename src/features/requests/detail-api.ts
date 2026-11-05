import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestRow } from "./api";
import { mapRequestRow } from "./api";
import { toRecord } from "./payload";
import type { RequestFormValues } from "@/lib/validation/request";
import type { BlockedReason, RequestPriority, RequestStatus } from "./model";

export interface RequestDetail extends RequestRow {
  description: string;
  labels: string[];
  blockedNote: string | null;
  createdAt: string;
  createdBy: string | null;
}

interface RequestDetailRecord {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  assignee_id: string | null;
  project_id: string | null;
  client_id: string | null;
  due_date: string | null;
  labels: string[];
  blocked_reason: BlockedReason | null;
  blocked_note: string | null;
  status_changed_at: string;
  updated_at: string;
  created_at: string;
  archived_at: string | null;
  created_by: string | null;
}

const COLUMNS =
  "id,title,description,status,priority,assignee_id,project_id,client_id,due_date,labels,blocked_reason,blocked_note,status_changed_at,updated_at,created_at,archived_at,created_by";

export function mapRequestDetail(record: RequestDetailRecord): RequestDetail {
  return {
    ...mapRequestRow(record),
    description: record.description,
    labels: record.labels,
    blockedNote: record.blocked_note,
    createdAt: record.created_at,
    createdBy: record.created_by,
  };
}

/** Resolves to null when the request does not exist or belongs to another workspace. */
export async function fetchRequestDetail(
  client: SupabaseClient,
  id: string,
): Promise<RequestDetail | null> {
  const { data, error } = await client.from("requests").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    throw new Error("Could not load the request.", { cause: error });
  }
  return data ? mapRequestDetail(data as unknown as RequestDetailRecord) : null;
}

export async function createRequest(
  client: SupabaseClient,
  workspaceId: string,
  values: RequestFormValues,
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("requests")
    .insert({ workspace_id: workspaceId, ...toRecord(values) })
    .select("id")
    .single();
  if (error) {
    throw new Error("Could not create the request.", { cause: error });
  }
  return { id: (data as unknown as { id: string }).id };
}

export async function updateRequest(
  client: SupabaseClient,
  id: string,
  values: RequestFormValues,
): Promise<void> {
  const { data, error } = await client
    .from("requests")
    .update(toRecord(values))
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error("Could not save the request.", { cause: error });
  }
  // Row level security hides rows from other workspaces by matching nothing, not by failing.
  if (!data || data.length === 0) {
    throw new Error("The request no longer exists.");
  }
}

export async function deleteRequest(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("requests").delete().eq("id", id);
  if (error) {
    throw new Error("Could not delete the request.", { cause: error });
  }
}
