"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import { fetchRecentActivity, fetchRequestActivity } from "./api";

export function useRecentActivity(limit: number) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.activityRecent(limit),
    queryFn: () => fetchRecentActivity(supabase, limit),
  });
}

export function useRequestActivity(requestId: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.requestActivity(requestId),
    queryFn: () => fetchRequestActivity(supabase, requestId),
  });
}
