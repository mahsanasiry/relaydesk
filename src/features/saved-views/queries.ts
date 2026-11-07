"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import { createSavedView, deleteSavedView, fetchSavedViews, renameSavedView } from "./api";

export function useSavedViews() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.savedViews,
    queryFn: () => fetchSavedViews(supabase),
  });
}

export function useCreateSavedView(owner: { workspaceId: string; userId: string }) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ name, query }: { name: string; query: string }) =>
      createSavedView(supabase, owner, name, query),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.savedViews }),
  });
}

export function useRenameSavedView() {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameSavedView(supabase, id, name),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.savedViews }),
  });
}

export function useDeleteSavedView() {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedView(supabase, id),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.savedViews }),
  });
}
