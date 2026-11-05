"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import type { RequestFormValues } from "@/lib/validation/request";
import { createRequest, deleteRequest, fetchRequestDetail, updateRequest } from "./detail-api";

export function useRequestDetail(id: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.requestDetail(id),
    queryFn: () => fetchRequestDetail(supabase, id),
  });
}

export function useCreateRequest(workspaceId: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: RequestFormValues) => createRequest(supabase, workspaceId, values),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.requests }),
  });
}

export function useUpdateRequest(id: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: RequestFormValues) => updateRequest(supabase, id, values),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.requests }),
  });
}

export function useDeleteRequest(id: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => deleteRequest(supabase, id),
    onSuccess: () => {
      client.removeQueries({ queryKey: queryKeys.requestDetail(id) });
      return client.invalidateQueries({ queryKey: queryKeys.requests });
    },
  });
}
