"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DataList } from "@/components/shared/data-list";
import type { Column } from "@/components/shared/data-list";
import { LoadFailed } from "@/components/shared/load-failed";
import { buttonClassName } from "@/components/ui/button";
import { useProjects } from "@/features/projects/queries";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";
import { isOpenStatus } from "@/features/requests/model";
import { useRequests } from "@/features/requests/queries";
import type { ClientRow } from "../api";
import { useClients } from "../queries";

function countBy<T>(items: readonly T[], key: (item: T) => string | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export function ClientsView() {
  const clients = useClients();
  const projects = useProjects();
  const requests = useRequests();

  const projectCounts = useMemo(
    () => countBy(projects.data ?? [], (project) => project.clientId),
    [projects.data],
  );
  const openCounts = useMemo(
    () =>
      countBy(
        (requests.data ?? []).filter((request) => isOpenStatus(request.status)),
        (request) => request.clientId,
      ),
    [requests.data],
  );

  const columns: Column<ClientRow>[] = [
    {
      header: "Client",
      primary: true,
      cell: (client) => (
        <Link href={`/app/clients/${client.id}`} className="text-primary underline">
          {client.name}
        </Link>
      ),
    },
    {
      header: "Contact",
      cell: (client) =>
        client.contactName || client.contactEmail ? (
          <>
            {client.contactName ? <span className="block">{client.contactName}</span> : null}
            {client.contactEmail ? (
              <span className="block text-muted-foreground">{client.contactEmail}</span>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">No contact</span>
        ),
    },
    { header: "Projects", cell: (client) => projectCounts.get(client.id) ?? 0 },
    {
      header: "Open requests",
      cell: (client) => openCounts.get(client.id) ?? 0,
    },
  ];

  const failed = clients.isError || projects.isError || requests.isError;
  const loading = clients.isPending || projects.isPending || requests.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link href="/app/clients/new" className={buttonClassName("primary")}>
          New client
        </Link>
      </div>

      {failed ? (
        <LoadFailed
          title="Clients could not be loaded"
          onRetry={() => {
            void clients.refetch();
            void projects.refetch();
            void requests.refetch();
          }}
        />
      ) : loading ? (
        <ListSkeleton />
      ) : clients.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="font-medium">No clients yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the people and companies you do work for.
          </p>
          <Link href="/app/clients/new" className={`${buttonClassName("primary")} mt-4`}>
            New client
          </Link>
        </div>
      ) : (
        <DataList
          caption="Clients"
          items={clients.data}
          columns={columns}
          getKey={(client) => client.id}
        />
      )}
    </div>
  );
}
