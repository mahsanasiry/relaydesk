"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import { fetchRequests } from "./api";

export function useRequests() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.requests,
    queryFn: () => fetchRequests(supabase),
  });
}
