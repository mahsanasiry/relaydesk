"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Pagination } from "@/components/shared/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/current-user";
import { useMembers } from "@/features/members/queries";
import { useProjects } from "@/features/projects/queries";
import {
  DEFAULT_REQUEST_QUERY,
  hasActiveFilters,
  parseRequestQuery,
  selectRequests,
  serializeRequestQuery,
  withFilters,
  withPage,
} from "../filters";
import type { RequestQuery } from "../filters";
import { useRequests } from "../queries";
import { ListSkeleton } from "./list-skeleton";
import { RequestCards } from "./request-cards";
import { RequestFilters } from "./request-filters";
import { RequestTable } from "./request-table";

export function RequestsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useCurrentUser();
  const requests = useRequests();
  const members = useMembers();
  const projects = useProjects();

  const query = useMemo(() => parseRequestQuery(searchParams), [searchParams]);
  const memberNames = useMemo(
    () => new Map((members.data ?? []).map((member) => [member.id, member.displayName])),
    [members.data],
  );
  const projectNames = useMemo(
    () => new Map((projects.data ?? []).map((project) => [project.id, project.name])),
    [projects.data],
  );
  const now = useMemo(() => new Date(requests.dataUpdatedAt), [requests.dataUpdatedAt]);
  const result = useMemo(
    () =>
      requests.data ? selectRequests(requests.data, query, { currentUserId: user.id, now }) : null,
    [requests.data, query, user.id, now],
  );

  const hrefFor = (next: RequestQuery) => {
    const text = serializeRequestQuery(next);
    return text ? `${pathname}?${text}` : pathname;
  };
  const go = (next: RequestQuery) => router.replace(hrefFor(next), { scroll: false });

  const failed = requests.isError || members.isError || projects.isError;
  const loading = requests.isPending || members.isPending || projects.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Requests</h1>
        <Link href="/app/requests/new" className={buttonClassName("primary")}>
          New request
        </Link>
      </div>

      <RequestFilters
        query={query}
        members={members.data ?? []}
        projects={projects.data ?? []}
        onChange={(changes) => go(withFilters(query, changes))}
      />

      {failed ? (
        <div className="space-y-3">
          <Alert tone="error" title="Requests could not be loaded">
            Check your connection and try again.
          </Alert>
          <Button
            variant="secondary"
            onClick={() => {
              void requests.refetch();
              void members.refetch();
              void projects.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : loading || result === null ? (
        <ListSkeleton />
      ) : result.total === 0 ? (
        hasActiveFilters(query) ? (
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-medium">No requests match these filters</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Remove a filter or search for something else.
            </p>
            <div className="mt-4">
              <Button variant="secondary" onClick={() => go(DEFAULT_REQUEST_QUERY)}>
                Clear filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="font-medium">No requests yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create the first request to start tracking work.
            </p>
            <Link href="/app/requests/new" className={`${buttonClassName("primary")} mt-4`}>
              New request
            </Link>
          </div>
        )
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {result.total === 1 ? "1 request" : `${result.total} requests`}
          </p>
          <RequestTable requests={result.items} context={{ memberNames, projectNames, now }} />
          <RequestCards requests={result.items} context={{ memberNames, projectNames, now }} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            hrefFor={(page) => hrefFor(withPage(query, page))}
          />
        </>
      )}
    </div>
  );
}
