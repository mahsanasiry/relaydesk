"use client";

import { useRouter } from "next/navigation";
import { LoadFailed } from "@/components/shared/load-failed";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/auth/current-user";
import { useClients } from "@/features/clients/queries";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";
import type { ProjectFormValues } from "@/lib/validation/project";
import { emptyProjectValues } from "../payload";
import { useCreateProject } from "../queries";
import { ProjectForm } from "./project-form";

export function NewProjectView({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const user = useCurrentUser();
  const clients = useClients();
  const create = useCreateProject(user.workspaceId);

  if (clients.isError) {
    return (
      <LoadFailed title="The form could not be loaded" onRetry={() => void clients.refetch()} />
    );
  }
  if (clients.isPending) {
    return <ListSkeleton />;
  }

  // An unknown client id in the link is ignored rather than failing the save later.
  const knownClient = clients.data.some((client) => client.id === clientId);

  async function submit(values: ProjectFormValues) {
    const created = await create.mutateAsync(values);
    notify("success", "Project created.");
    router.push(`/app/projects/${created.id}`);
  }

  return (
    <ProjectForm
      defaults={emptyProjectValues(knownClient ? clientId : "")}
      clients={clients.data}
      submitLabel="Create project"
      savingLabel="Creating..."
      onSubmit={submit}
    />
  );
}
