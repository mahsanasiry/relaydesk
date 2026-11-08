"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import { fetchBlockerHistory } from "./api";
import { BLOCKER_HISTORY_DAYS } from "./report";

export function useBlockerHistory(days = BLOCKER_HISTORY_DAYS) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.blockerHistory(days),
    queryFn: () => fetchBlockerHistory(supabase, days),
  });
}
