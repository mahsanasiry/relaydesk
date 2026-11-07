"use client";

import Link from "next/link";
import { LoadFailed } from "@/components/shared/load-failed";
import { buttonClassName } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useClients } from "@/features/clients/queries";
import { requestsHref } from "@/features/dashboard/links";
import { StatusBadge } from "@/features/requests/components/badges";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";
import { sortRequests } from "@/features/requests/filters";
import { isOpenStatus } from "@/features/requests/model";
import { useRequests } from "@/features/requests/queries";
import type { ProjectFormValues } from "@/lib/validation/project";
import { toProjectFormValues } from "../payload";
import { useProjects, useUpdateProject } from "../queries";
import { ProjectForm } from "./project-form";
import { ProjectStatusBadge } from "./project-status-badge";

const LISTED_REQUESTS = 25;

export function ProjectDetail({ projectId }: { projectId: string }) {
  const { notify } = useToast();
  const projects = useProjects();
  const clients = useClients();
  const requests = useRequests();
  const update = useUpdateProject(projectId);

  if (projects.isError || clients.isError || requests.isError) {
    return (
      <LoadFailed
        title="This project could not be loaded"
        onRetry={() => {
          void projects.refetch();
          void clients.refetch();
          void requests.refetch();
        }}
      />
    );
  }
  if (projects.isPending || clients.isPending || requests.isPending) {
    return <ListSkeleton />;
  }

  const project = projects.data.find((item) => item.id === projectId.toLowerCase());
  if (!project) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="mt-2 text-muted-foreground">
          It may not exist, or you may not have access to it.
        </p>
        <Link href="/app/projects" className={`${buttonClassName("secondary")} mt-4`}>
          Back to projects
        </Link>
      </div>
    );
  }

  const own = requests.data.filter((request) => request.projectId === project.id);
  const listed = sortRequests(own, "updated").slice(0, LISTED_REQUESTS);
  const openCount = own.filter((request) => isOpenStatus(request.status)).length;
  const clientName =
    project.clientId === null
      ? null
      : (clients.data.find((client) => client.id === project.clientId)?.name ?? null);

  async function save(values: ProjectFormValues) {
    await update.mutateAsync(values);
    notify("success", "Project saved.");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/projects" className="text-sm text-primary underline">
          Back to projects
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        {clientName ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Client:{" "}
            <Link href={`/app/clients/${project.clientId}`} className="text-primary underline">
              {clientName}
            </Link>
          </p>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="project-edit-heading" className="lg:col-span-2">
          <h2 id="project-edit-heading" className="mb-4 text-lg font-semibold">
            Details
          </h2>
          <ProjectForm
            defaults={toProjectFormValues(project)}
            clients={clients.data}
            submitLabel="Save changes"
            savingLabel="Saving..."
            onSubmit={save}
          />
        </section>

        <section aria-labelledby="project-requests-heading" className="space-y-3">
          <h2 id="project-requests-heading" className="text-lg font-semibold">
            Requests
          </h2>
          <p className="text-sm text-muted-foreground">
            {own.length === 0 ? "No requests yet." : `${openCount} open of ${own.length}.`}
          </p>
          {listed.length > 0 ? (
            <ul className="space-y-2">
              {listed.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3"
                >
                  <Link
                    href={`/app/requests/${request.id}`}
                    className="text-sm text-primary underline"
                  >
                    {request.title}
                  </Link>
                  <StatusBadge status={request.status} />
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/app/requests/new?project=${project.id}`}
              className={buttonClassName("primary")}
            >
              New request
            </Link>
            {own.length > listed.length ? (
              <Link
                href={requestsHref({ projectId: project.id })}
                className={buttonClassName("secondary")}
              >
                {`View all ${own.length}`}
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
