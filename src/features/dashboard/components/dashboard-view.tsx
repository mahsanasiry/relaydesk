"use client";

import { useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRecentActivity } from "@/features/activity/queries";
import { useCurrentUser } from "@/features/auth/current-user";
import { useMembers } from "@/features/members/queries";
import { useProjects } from "@/features/projects/queries";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";
import { OPEN_STATUSES } from "@/features/requests/model";
import { useRequests } from "@/features/requests/queries";
import { useWorkspaceSettings } from "../queries";
import { requestsHref } from "../links";
import { buildDashboardSummary } from "../summary";
import { AttentionList } from "./attention-list";
import { BlockedGroups } from "./blocked-groups";
import { ProjectSummary } from "./project-summary";
import { RecentActivity } from "./recent-activity";
import { StatCards } from "./stat-cards";

const RECENT_ACTIVITY_LIMIT = 10;

export function DashboardView() {
  const user = useCurrentUser();
  const requests = useRequests();
  const projects = useProjects();
  const members = useMembers();
  const settings = useWorkspaceSettings();
  const activity = useRecentActivity(RECENT_ACTIVITY_LIMIT);

  const memberNames = useMemo(
    () => new Map((members.data ?? []).map((member) => [member.id, member.displayName])),
    [members.data],
  );
  const summary = useMemo(
    () =>
      requests.data && projects.data && settings.data
        ? buildDashboardSummary({
            requests: requests.data,
            projects: projects.data,
            currentUserId: user.id,
            settings: settings.data,
            now: new Date(requests.dataUpdatedAt),
          })
        : null,
    [requests.data, requests.dataUpdatedAt, projects.data, settings.data, user.id],
  );

  const queries = [requests, projects, members, settings, activity];
  const failed = queries.some((query) => query.isError);
  const loading = queries.some((query) => query.isPending);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {failed ? (
        <div className="max-w-md space-y-3">
          <Alert tone="error" title="The dashboard could not be loaded">
            Check your connection and try again.
          </Alert>
          <Button
            variant="secondary"
            onClick={() => {
              for (const query of queries) {
                if (query.isError) void query.refetch();
              }
            }}
          >
            Try again
          </Button>
        </div>
      ) : loading || summary === null || !activity.data ? (
        <ListSkeleton />
      ) : (
        <>
          <StatCards
            stats={[
              {
                label: "Open requests",
                value: summary.openCount,
                href: requestsHref({ statuses: [...OPEN_STATUSES] }),
              },
              {
                label: "Overdue",
                value: summary.overdueCount,
                href: requestsHref({ overdueOnly: true }),
              },
              {
                label: "Waiting",
                value: summary.waitingCount,
                href: requestsHref({ statuses: ["waiting"] }),
              },
              {
                label: "Assigned to me",
                value: summary.assignedToMeCount,
                href: requestsHref({ statuses: [...OPEN_STATUSES], assignee: "me" }),
              },
            ]}
          />
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <AttentionList items={summary.needsAttention} memberNames={memberNames} />
              <RecentActivity events={activity.data} memberNames={memberNames} />
            </div>
            <div className="space-y-8">
              <BlockedGroups groups={summary.blockedByReason} />
              <ProjectSummary counts={summary.projectStatusCounts} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
