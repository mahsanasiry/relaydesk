"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DataList } from "@/components/shared/data-list";
import type { Column } from "@/components/shared/data-list";
import { LoadFailed } from "@/components/shared/load-failed";
import { buttonClassName } from "@/components/ui/button";
import { useClients } from "@/features/clients/queries";
import { isOpenStatus } from "@/features/requests/model";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";
import { useRequests } from "@/features/requests/queries";
import type { Project } from "../api";
import { describeDateRange } from "../dates";
import { useProjects } from "../queries";
import { ProjectStatusBadge } from "./project-status-badge";

export function ProjectsView() {
  const projects = useProjects();
  const clients = useClients();
  const requests = useRequests();

  const clientNames = useMemo(
    () => new Map((clients.data ?? []).map((client) => [client.id, client.name])),
    [clients.data],
  );
  const openCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of requests.data ?? []) {
      if (request.projectId !== null && isOpenStatus(request.status)) {
        counts.set(request.projectId, (counts.get(request.projectId) ?? 0) + 1);
      }
    }
    return counts;
  }, [requests.data]);

  const columns: Column<Project>[] = [
    {
      header: "Project",
      primary: true,
      cell: (project) => (
        <Link href={`/app/projects/${project.id}`} className="text-primary underline">
          {project.name}
        </Link>
      ),
    },
    {
      header: "Client",
      cell: (project) =>
        project.clientId === null ? (
          <span className="text-muted-foreground">No client</span>
        ) : (
          (clientNames.get(project.clientId) ?? "Unknown client")
        ),
    },
    {
      header: "Status",
      cell: (project) => <ProjectStatusBadge status={project.status} />,
    },
    {
      header: "Dates",
      cell: (project) => describeDateRange(project.startDate, project.endDate),
    },
    {
      header: "Open requests",
      cell: (project) => openCounts.get(project.id) ?? 0,
    },
  ];

  const failed = projects.isError || clients.isError || requests.isError;
  const loading = projects.isPending || clients.isPending || requests.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link href="/app/projects/new" className={buttonClassName("primary")}>
          New project
        </Link>
      </div>

      {failed ? (
        <LoadFailed
          title="Projects could not be loaded"
          onRetry={() => {
            void projects.refetch();
            void clients.refetch();
            void requests.refetch();
          }}
        />
      ) : loading ? (
        <ListSkeleton />
      ) : projects.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="font-medium">No projects yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects group related requests and tie them to a client.
          </p>
          <Link href="/app/projects/new" className={`${buttonClassName("primary")} mt-4`}>
            New project
          </Link>
        </div>
      ) : (
        <DataList
          caption="Projects"
          items={projects.data}
          columns={columns}
          getKey={(project) => project.id}
        />
      )}
    </div>
  );
}
