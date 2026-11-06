import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestStatus } from "./model";

export interface RelatedRequest {
  id: string;
  title: string;
  status: RequestStatus;
  archived: boolean;
}

/**
 * A link is stored once per pair with the smaller id first, which is the order Postgres uses
 * for uuids. Hex digits compare the same way as text, as long as both ids are lowercase.
 */
export function orderedPair(a: string, b: string): { requestId: string; relatedRequestId: string } {
  const first = a.toLowerCase();
  const second = b.toLowerCase();
  return first < second
    ? { requestId: first, relatedRequestId: second }
    : { requestId: second, relatedRequestId: first };
}

export function otherEnd(
  row: { request_id: string; related_request_id: string },
  id: string,
): string {
  return row.request_id === id.toLowerCase() ? row.related_request_id : row.request_id;
}

export async function fetchRelatedRequests(
  client: SupabaseClient,
  requestId: string,
): Promise<RelatedRequest[]> {
  const id = requestId.toLowerCase();
  const { data: links, error } = await client
    .from("request_relations")
    .select("request_id,related_request_id")
    .or(`request_id.eq.${id},related_request_id.eq.${id}`);
  if (error) {
    throw new Error("Could not load related requests.", { cause: error });
  }

  const ids = (
    (links ?? []) as unknown as { request_id: string; related_request_id: string }[]
  ).map((row) => otherEnd(row, id));
  if (ids.length === 0) {
    return [];
  }

  const { data: requests, error: requestsError } = await client
    .from("requests")
    .select("id,title,status,archived_at")
    .in("id", ids)
    .order("title");
  if (requestsError) {
    throw new Error("Could not load related requests.", { cause: requestsError });
  }

  return (
    (requests ?? []) as unknown as {
      id: string;
      title: string;
      status: RequestStatus;
      archived_at: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    archived: row.archived_at !== null,
  }));
}

export async function addRelation(
  client: SupabaseClient,
  workspaceId: string,
  requestId: string,
  otherId: string,
): Promise<void> {
  const pair = orderedPair(requestId, otherId);
  const { error } = await client.from("request_relations").insert({
    workspace_id: workspaceId,
    request_id: pair.requestId,
    related_request_id: pair.relatedRequestId,
  });
  if (error) {
    throw new Error("Could not link the requests.", { cause: error });
  }
}

export async function removeRelation(
  client: SupabaseClient,
  requestId: string,
  otherId: string,
): Promise<void> {
  const pair = orderedPair(requestId, otherId);
  const { error } = await client
    .from("request_relations")
    .delete()
    .eq("request_id", pair.requestId)
    .eq("related_request_id", pair.relatedRequestId);
  if (error) {
    throw new Error("Could not remove the link.", { cause: error });
  }
}
