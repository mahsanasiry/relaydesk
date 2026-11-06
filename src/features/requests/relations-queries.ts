"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import { addRelation, fetchRelatedRequests, removeRelation } from "./relations";

export function useRelatedRequests(requestId: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.requestRelations(requestId),
    queryFn: () => fetchRelatedRequests(supabase, requestId),
  });
}

export function useAddRelation(requestId: string, workspaceId: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (otherId: string) => addRelation(supabase, workspaceId, requestId, otherId),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.requestRelations(requestId) }),
  });
}

export function useRemoveRelation(requestId: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (otherId: string) => removeRelation(supabase, requestId, otherId),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.requestRelations(requestId) }),
  });
}
