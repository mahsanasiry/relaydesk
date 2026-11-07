"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import type { ClientFormValues } from "@/lib/validation/client";
import { createClientRow, fetchClients, updateClientRow } from "./api";

export function useClients() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: () => fetchClients(supabase),
  });
}

export function useCreateClient(workspaceId: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: ClientFormValues) => createClientRow(supabase, workspaceId, values),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.clients }),
  });
}

export function useUpdateClient(id: string) {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: ClientFormValues) => updateClientRow(supabase, id, values),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.clients }),
  });
}
