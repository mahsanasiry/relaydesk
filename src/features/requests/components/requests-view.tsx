"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Pagination } from "@/components/shared/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/auth/current-user";
import { useMembers } from "@/features/members/queries";
import { useProjects } from "@/features/projects/queries";
import { useBulkUpdateRequests } from "../bulk-queries";
import { describeBulkResult, toggleId, togglePage, visibleSelection } from "../bulk";
import type { BulkAction, BulkPatch } from "../bulk";
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
import { BulkBar } from "./bulk-bar";
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
  const { notify } = useToast();
  const bulk = useBulkUpdateRequests();
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());

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

  // Only rows on screen count, so an action never reaches requests hidden by a filter or page.
  const pageIds = useMemo(() => (result?.items ?? []).map((item) => item.id), [result]);
  const selected = useMemo(() => visibleSelection(picked, pageIds), [picked, pageIds]);
  const allSelected = pageIds.length > 0 && selected.size === pageIds.length;

  async function applyBulk(action: BulkAction, patch: BulkPatch) {
    const ids = [...selected];
    const updated = await bulk.mutateAsync({ ids, patch });
    notify("success", describeBulkResult(action, updated, ids.length));
    setPicked(new Set());
  }

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
          {selected.size > 0 ? (
            <BulkBar
              count={selected.size}
              members={members.data ?? []}
              onApply={applyBulk}
              onClear={() => setPicked(new Set())}
            />
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {result.total === 1 ? "1 request" : `${result.total} requests`}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setPicked(togglePage(selected, pageIds))}
                className="size-5 accent-primary"
              />
              Select all on this page
            </label>
          </div>
          <RequestTable
            requests={result.items}
            context={{ memberNames, projectNames, now }}
            selected={selected}
            onToggle={(id) => setPicked(toggleId(selected, id))}
          />
          <RequestCards
            requests={result.items}
            context={{ memberNames, projectNames, now }}
            selected={selected}
            onToggle={(id) => setPicked(toggleId(selected, id))}
          />
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
