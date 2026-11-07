"use client";

import Link from "next/link";
import { LoadFailed } from "@/components/shared/load-failed";
import { buttonClassName } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ProjectStatusBadge } from "@/features/projects/components/project-status-badge";
import { useProjects } from "@/features/projects/queries";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";
import { isOpenStatus } from "@/features/requests/model";
import { useRequests } from "@/features/requests/queries";
import type { ClientFormValues } from "@/lib/validation/client";
import { toClientFormValues } from "../payload";
import { useClients, useUpdateClient } from "../queries";
import { ClientForm } from "./client-form";

export function ClientDetail({ clientId }: { clientId: string }) {
  const { notify } = useToast();
  const clients = useClients();
  const projects = useProjects();
  const requests = useRequests();
  const update = useUpdateClient(clientId);

  if (clients.isError || projects.isError || requests.isError) {
    return (
      <LoadFailed
        title="This client could not be loaded"
        onRetry={() => {
          void clients.refetch();
          void projects.refetch();
          void requests.refetch();
        }}
      />
    );
  }
  if (clients.isPending || projects.isPending || requests.isPending) {
    return <ListSkeleton />;
  }

  const client = clients.data.find((item) => item.id === clientId.toLowerCase());
  if (!client) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">Client not found</h1>
        <p className="mt-2 text-muted-foreground">
          It may not exist, or you may not have access to it.
        </p>
        <Link href="/app/clients" className={`${buttonClassName("secondary")} mt-4`}>
          Back to clients
        </Link>
      </div>
    );
  }

  const own = projects.data.filter((project) => project.clientId === client.id);
  const openRequests = requests.data.filter(
    (request) => request.clientId === client.id && isOpenStatus(request.status),
  ).length;

  async function save(values: ClientFormValues) {
    await update.mutateAsync(values);
    notify("success", "Client saved.");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/clients" className="text-sm text-primary underline">
          Back to clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{client.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {openRequests === 1 ? "1 open request" : `${openRequests} open requests`}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="client-edit-heading" className="lg:col-span-2">
          <h2 id="client-edit-heading" className="mb-4 text-lg font-semibold">
            Details
          </h2>
          <ClientForm
            defaults={toClientFormValues(client)}
            submitLabel="Save changes"
            savingLabel="Saving..."
            onSubmit={save}
          />
        </section>

        <section aria-labelledby="client-projects-heading" className="space-y-3">
          <h2 id="client-projects-heading" className="text-lg font-semibold">
            Projects
          </h2>
          {own.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects for this client yet.</p>
          ) : (
            <ul className="space-y-2">
              {own.map((project) => (
                <li
                  key={project.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3"
                >
                  <Link
                    href={`/app/projects/${project.id}`}
                    className="text-sm text-primary underline"
                  >
                    {project.name}
                  </Link>
                  <ProjectStatusBadge status={project.status} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/app/projects/new?client=${client.id}`}
            className={buttonClassName("primary")}
          >
            New project
          </Link>
        </section>
      </div>
    </div>
  );
}
