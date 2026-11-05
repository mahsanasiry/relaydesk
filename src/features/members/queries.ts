"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";

export interface Member {
  id: string;
  displayName: string;
}

export function useMembers() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.members,
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,display_name")
        .order("display_name")
        .order("id");
      if (error) {
        throw new Error("Could not load team members.", { cause: error });
      }
      // The client is not generated from the schema, so the row shape is stated here.
      const rows = (data ?? []) as unknown as { id: string; display_name: string }[];
      return rows.map((row) => ({ id: row.id, displayName: row.display_name }));
    },
    // Membership rarely changes during a session.
    staleTime: 5 * 60_000,
  });
}
