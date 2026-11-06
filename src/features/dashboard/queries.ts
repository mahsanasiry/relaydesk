"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import { fetchWorkspaceSettings } from "./api";

export function useWorkspaceSettings() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.workspaceSettings,
    queryFn: () => fetchWorkspaceSettings(supabase),
    staleTime: 5 * 60_000,
  });
}
