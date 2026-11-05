import type { SupabaseClient } from "@supabase/supabase-js";
import type { FilterableRequest } from "./filters";
import type { BlockedReason, RequestPriority, RequestStatus } from "./model";

export interface RequestRow extends FilterableRequest {
  clientId: string | null;
  statusChangedAt: string;
}

interface RequestRecord {
  id: string;
  title: string;
  status: RequestStatus;
  priority: RequestPriority;
  assignee_id: string | null;
  project_id: string | null;
  client_id: string | null;
  due_date: string | null;
  blocked_reason: BlockedReason | null;
  status_changed_at: string;
  updated_at: string;
  archived_at: string | null;
}

const COLUMNS =
  "id,title,status,priority,assignee_id,project_id,client_id,due_date,blocked_reason,status_changed_at,updated_at,archived_at";

// PostgREST answers at most 1000 rows per call by default, so larger workspaces are read in pages.
export const API_PAGE_SIZE = 1000;
export const MAX_LOADED_REQUESTS = 10_000;

export function mapRequestRow(record: RequestRecord): RequestRow {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    priority: record.priority,
    assigneeId: record.assignee_id,
    projectId: record.project_id,
    clientId: record.client_id,
    dueDate: record.due_date,
    blockedReason: record.blocked_reason,
    statusChangedAt: record.status_changed_at,
    updatedAt: record.updated_at,
    archivedAt: record.archived_at,
  };
}

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = API_PAGE_SIZE,
  maxRows = MAX_LOADED_REQUESTS,
): Promise<T[]> {
  const rows: T[] = [];
  while (rows.length < maxRows) {
    const page = await fetchPage(rows.length, rows.length + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows.slice(0, maxRows);
}

export async function fetchRequests(client: SupabaseClient): Promise<RequestRow[]> {
  const records = await fetchAllPages(async (from, to) => {
    const { data, error } = await client
      .from("requests")
      .select(COLUMNS)
      .is("archived_at", null)
      // The id breaks ties so rows cannot move between pages while paging.
      .order("updated_at", { ascending: false })
      .order("id")
      .range(from, to);
    if (error) {
      throw new Error("Could not load requests.", { cause: error });
    }
    // The client is not generated from the schema, so the row shape is stated here.
    return (data ?? []) as unknown as RequestRecord[];
  });
  return records.map(mapRequestRow);
}
