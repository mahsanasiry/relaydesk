"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import type { ProfileFormValues, WorkspaceFormValues } from "@/lib/validation/settings";
import { fetchWorkspaceDetails, updateDisplayName, updateWorkspace } from "./api";

export function useWorkspaceDetails() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.workspaceDetails,
    queryFn: () => fetchWorkspaceDetails(supabase),
  });
}

export function useUpdateWorkspace(id: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: WorkspaceFormValues) => updateWorkspace(supabase, id, values),
    // The dashboard reads the same thresholds, so the whole workspace branch is refreshed.
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.workspace }),
  });
}

export function useUpdateDisplayName(userId: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: ProfileFormValues) => updateDisplayName(supabase, userId, values),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.members }),
  });
}
