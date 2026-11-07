"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import type { ProjectFormValues } from "@/lib/validation/project";
import { createProject, fetchProjects, updateProject } from "./api";
import type { Project } from "./api";

/** What a dropdown of projects needs. */
export type ProjectOption = Pick<Project, "id" | "name" | "status">;

export function useProjects() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => fetchProjects(supabase),
  });
}

export function useCreateProject(workspaceId: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: ProjectFormValues) => createProject(supabase, workspaceId, values),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

export function useUpdateProject(id: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: ProjectFormValues) => updateProject(supabase, id, values),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}
