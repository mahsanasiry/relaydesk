"use client";

import { useMemo } from "react";
import { LoadFailed } from "@/components/shared/load-failed";
import { useMembers } from "@/features/members/queries";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";
import { useRequests } from "@/features/requests/queries";
import { useBlockerHistory } from "../queries";
import { buildLongestStopped, buildResolvedBlockers, buildStoppedNow } from "../report";
import { LongestStopped } from "./longest-stopped";
import { ResolvedBlockers } from "./resolved-blockers";
import { StoppedNow } from "./stopped-now";

const LONGEST_COUNT = 5;

export function ReportsView() {
  const requests = useRequests();
  const members = useMembers();
  const history = useBlockerHistory();

  const memberNames = useMemo(
    () => new Map((members.data ?? []).map((member) => [member.id, member.displayName])),
    [members.data],
  );
  const loadedAt = requests.dataUpdatedAt;
  const stoppedNow = useMemo(
    () => (requests.data ? buildStoppedNow(requests.data, new Date(loadedAt)) : null),
    [requests.data, loadedAt],
  );
  const longest = useMemo(
    () =>
      requests.data ? buildLongestStopped(requests.data, new Date(loadedAt), LONGEST_COUNT) : null,
    [requests.data, loadedAt],
  );
  const resolved = useMemo(
    () => (history.data ? buildResolvedBlockers(history.data) : null),
    [history.data],
  );

  const queries = [requests, members, history];
  const failed = queries.some((query) => query.isError);
  const loading = queries.some((query) => query.isPending);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Why work is stopped, how long it has been stopped, and how long blockers usually last.
        </p>
      </div>

      {failed ? (
        <LoadFailed
          title="The reports could not be loaded"
          onRetry={() => {
            for (const query of queries) {
              if (query.isError) void query.refetch();
            }
          }}
        />
      ) : loading || stoppedNow === null || longest === null || resolved === null ? (
        <ListSkeleton />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-8">
            <StoppedNow rows={stoppedNow} />
            <LongestStopped items={longest} memberNames={memberNames} />
          </div>
          <ResolvedBlockers rows={resolved} />
        </div>
      )}
    </div>
  );
}
