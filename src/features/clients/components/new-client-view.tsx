"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/auth/current-user";
import type { ClientFormValues } from "@/lib/validation/client";
import { emptyClientValues } from "../payload";
import { useCreateClient } from "../queries";
import { ClientForm } from "./client-form";

export function NewClientView() {
  const router = useRouter();
  const { notify } = useToast();
  const user = useCurrentUser();
  const create = useCreateClient(user.workspaceId);

  async function submit(values: ClientFormValues) {
    const created = await create.mutateAsync(values);
    notify("success", "Client created.");
    router.push(`/app/clients/${created.id}`);
  }

  return (
    <ClientForm
      defaults={emptyClientValues()}
      submitLabel="Create client"
      savingLabel="Creating..."
      onSubmit={submit}
    />
  );
}
