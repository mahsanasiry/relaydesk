"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import { fetchActivityFeed } from "./feed-api";
import { serializeFeedQuery } from "./feed-query";
import type { ActivityFeedQuery } from "./feed-query";

export function useActivityFeed(query: ActivityFeedQuery) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.activityFeed(serializeFeedQuery(query)),
    queryFn: () => fetchActivityFeed(supabase, query),
    // Paging keeps the old page on screen until the next one arrives instead of flashing empty.
    placeholderData: keepPreviousData,
  });
}
