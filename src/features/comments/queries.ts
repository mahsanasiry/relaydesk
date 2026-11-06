"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import { addComment, fetchComments } from "./api";

export function useComments(requestId: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.requestComments(requestId),
    queryFn: () => fetchComments(supabase, requestId),
  });
}

export function useAddComment(requestId: string, workspaceId: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => addComment(supabase, workspaceId, requestId, body),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.requestComments(requestId) }),
        // Adding a comment is also an activity event.
        client.invalidateQueries({ queryKey: queryKeys.requestActivity(requestId) }),
      ]),
  });
}
