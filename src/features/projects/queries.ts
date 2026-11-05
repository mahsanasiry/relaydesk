"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import type { ProjectStatus } from "./model";

export interface ProjectOption {
  id: string;
  name: string;
  status: ProjectStatus;
}

export function useProjects() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async (): Promise<ProjectOption[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,name,status")
        .order("name")
        .order("id");
      if (error) {
        throw new Error("Could not load projects.", { cause: error });
      }
      // The client is not generated from the schema, so the row shape is stated here.
      return (data ?? []) as unknown as ProjectOption[];
    },
  });
}
