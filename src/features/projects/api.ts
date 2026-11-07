import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPages } from "@/features/requests/api";
import type { ProjectFormValues } from "@/lib/validation/project";
import type { ProjectStatus } from "./model";
import { toProjectRecord } from "./payload";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  clientId: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  client_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const COLUMNS = "id,name,description,status,client_id,start_date,end_date,created_at";

export function mapProject(record: ProjectRecord): Project {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    status: record.status,
    clientId: record.client_id,
    startDate: record.start_date,
    endDate: record.end_date,
    createdAt: record.created_at,
  };
}

export async function fetchProjects(client: SupabaseClient): Promise<Project[]> {
  const records = await fetchAllPages(async (from, to) => {
    const { data, error } = await client
      .from("projects")
      .select(COLUMNS)
      .order("name")
      .order("id")
      .range(from, to);
    if (error) {
      throw new Error("Could not load projects.", { cause: error });
    }
    return (data ?? []) as unknown as ProjectRecord[];
  });
  return records.map(mapProject);
}

export async function createProject(
  client: SupabaseClient,
  workspaceId: string,
  values: ProjectFormValues,
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("projects")
    .insert({ workspace_id: workspaceId, ...toProjectRecord(values) })
    .select("id")
    .single();
  if (error) {
    throw new Error("Could not create the project.", { cause: error });
  }
  return { id: (data as unknown as { id: string }).id };
}

export async function updateProject(
  client: SupabaseClient,
  id: string,
  values: ProjectFormValues,
): Promise<void> {
  const { data, error } = await client
    .from("projects")
    .update(toProjectRecord(values))
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error("Could not save the project.", { cause: error });
  }
  if (!data || data.length === 0) {
    throw new Error("The project no longer exists.");
  }
}
