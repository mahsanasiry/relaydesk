"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import { bulkUpdateRequests } from "./bulk-api";
import type { BulkPatch } from "./bulk";

export function useBulkUpdateRequests() {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: readonly string[]; patch: BulkPatch }) =>
      bulkUpdateRequests(supabase, ids, patch),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.requests }),
  });
}
