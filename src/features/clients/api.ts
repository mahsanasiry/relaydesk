import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPages } from "@/features/requests/api";
import type { ClientFormValues } from "@/lib/validation/client";
import { toClientRecord } from "./payload";

export interface ClientRow {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  createdAt: string;
}

interface ClientRecord {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  created_at: string;
}

const COLUMNS = "id,name,contact_name,contact_email,contact_phone,notes,created_at";

export function mapClient(record: ClientRecord): ClientRow {
  return {
    id: record.id,
    name: record.name,
    contactName: record.contact_name,
    contactEmail: record.contact_email,
    contactPhone: record.contact_phone,
    notes: record.notes,
    createdAt: record.created_at,
  };
}

export async function fetchClients(client: SupabaseClient): Promise<ClientRow[]> {
  const records = await fetchAllPages(async (from, to) => {
    const { data, error } = await client
      .from("clients")
      .select(COLUMNS)
      .order("name")
      .order("id")
      .range(from, to);
    if (error) {
      throw new Error("Could not load clients.", { cause: error });
    }
    return (data ?? []) as unknown as ClientRecord[];
  });
  return records.map(mapClient);
}

export async function createClientRow(
  client: SupabaseClient,
  workspaceId: string,
  values: ClientFormValues,
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("clients")
    .insert({ workspace_id: workspaceId, ...toClientRecord(values) })
    .select("id")
    .single();
  if (error) {
    throw new Error("Could not create the client.", { cause: error });
  }
  return { id: (data as unknown as { id: string }).id };
}

export async function updateClientRow(
  client: SupabaseClient,
  id: string,
  values: ClientFormValues,
): Promise<void> {
  const { data, error } = await client
    .from("clients")
    .update(toClientRecord(values))
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error("Could not save the client.", { cause: error });
  }
  if (!data || data.length === 0) {
    throw new Error("The client no longer exists.");
  }
}
