"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Pagination } from "@/components/shared/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { useMembers } from "@/features/members/queries";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";
import { actorName } from "../describe";
import { useActivityFeed } from "../feed-queries";
import {
  DEFAULT_FEED_QUERY,
  feedPageCount,
  parseFeedQuery,
  serializeFeedQuery,
  withFeedFilters,
} from "../feed-query";
import type { ActivityFeedQuery } from "../feed-query";
import { ACTIVITY_FILTERS, isActivityFilter } from "../model";
import { ActivityEntry } from "./activity-entry";

export function ActivityView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(() => parseFeedQuery(searchParams), [searchParams]);
  const feed = useActivityFeed(query);
  const members = useMembers();

  const names = useMemo(
    () => new Map((members.data ?? []).map((member) => [member.id, member.displayName])),
    [members.data],
  );

  const hrefFor = (next: ActivityFeedQuery) => {
    const text = serializeFeedQuery(next);
    return text ? `${pathname}?${text}` : pathname;
  };
  const go = (next: ActivityFeedQuery) => router.replace(hrefFor(next), { scroll: false });

  const filtered = query.filter !== "all" || query.actorId !== null;
  const failed = feed.isError || members.isError;
  const loading = feed.isPending || members.isPending;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Activity</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <SelectField
          label="Show"
          value={query.filter}
          onChange={(event) => {
            const value = event.target.value;
            if (isActivityFilter(value)) go(withFeedFilters(query, { filter: value }));
          }}
        >
          {ACTIVITY_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Person"
          value={query.actorId ?? ""}
          onChange={(event) => go(withFeedFilters(query, { actorId: event.target.value || null }))}
        >
          <option value="">Everyone</option>
          {(members.data ?? []).map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </SelectField>
      </div>

      {failed ? (
        <div className="max-w-md space-y-3">
          <Alert tone="error" title="The activity could not be loaded">
            Check your connection and try again.
          </Alert>
          <Button
            variant="secondary"
            onClick={() => {
              void feed.refetch();
              void members.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : loading ? (
        <ListSkeleton />
      ) : feed.data.events.length === 0 && query.page > 1 ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="font-medium">That page does not exist</h2>
          <p className="mt-1 text-sm text-muted-foreground">There is no activity this far back.</p>
          <Link
            href={hrefFor({ ...query, page: 1 })}
            className={`${buttonClassName("secondary")} mt-4`}
          >
            Go to the first page
          </Link>
        </div>
      ) : feed.data.events.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="font-medium">
            {filtered ? "No activity matches these filters" : "Nothing has happened yet"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered
              ? "Show everything or choose someone else."
              : "Changes to requests and new comments appear here."}
          </p>
          {filtered ? (
            <div className="mt-4">
              <Button variant="secondary" onClick={() => go(DEFAULT_FEED_QUERY)}>
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {feed.data.total === 1 ? "1 event" : `${feed.data.total} events`}
          </p>
          <ol className="space-y-4">
            {feed.data.events.map((event) => (
              <ActivityEntry
                key={event.id}
                event={event}
                actor={actorName(event.actorId, names)}
                showRequest
              />
            ))}
          </ol>
          <Pagination
            page={query.page}
            pageCount={feedPageCount(feed.data.total)}
            hrefFor={(page) => hrefFor({ ...query, page })}
          />
        </>
      )}
    </div>
  );
}
