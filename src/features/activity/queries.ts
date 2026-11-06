"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import { fetchRequestActivity } from "./api";

export function useRequestActivity(requestId: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.requestActivity(requestId),
    queryFn: () => fetchRequestActivity(supabase, requestId),
  });
}
