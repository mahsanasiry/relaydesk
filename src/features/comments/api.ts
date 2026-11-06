import type { SupabaseClient } from "@supabase/supabase-js";

export interface Comment {
  id: string;
  authorId: string | null;
  body: string;
  createdAt: string;
}

interface CommentRecord {
  id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export function mapComment(record: CommentRecord): Comment {
  return {
    id: record.id,
    authorId: record.author_id,
    body: record.body,
    createdAt: record.created_at,
  };
}

export async function fetchComments(client: SupabaseClient, requestId: string): Promise<Comment[]> {
  const { data, error } = await client
    .from("comments")
    .select("id,author_id,body,created_at")
    .eq("request_id", requestId)
    .order("created_at")
    .order("id");
  if (error) {
    throw new Error("Could not load the comments.", { cause: error });
  }
  return ((data ?? []) as unknown as CommentRecord[]).map(mapComment);
}

export async function addComment(
  client: SupabaseClient,
  workspaceId: string,
  requestId: string,
  body: string,
): Promise<void> {
  // author_id is filled in by the database from the signed-in user, so it cannot be forged.
  const { error } = await client
    .from("comments")
    .insert({ workspace_id: workspaceId, request_id: requestId, body: body.trim() });
  if (error) {
    throw new Error("Could not add the comment.", { cause: error });
  }
}
