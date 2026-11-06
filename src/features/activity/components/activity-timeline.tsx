"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { useMembers } from "@/features/members/queries";
import { actorName } from "../describe";
import { ACTIVITY_FILTERS, filterActivity, isActivityFilter } from "../model";
import type { ActivityFilter } from "../model";
import { useRequestActivity } from "../queries";
import { ActivityEntry } from "./activity-entry";

export function ActivityTimeline({ requestId }: { requestId: string }) {
  const activity = useRequestActivity(requestId);
  const members = useMembers();
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const names = useMemo(
    () => new Map((members.data ?? []).map((member) => [member.id, member.displayName])),
    [members.data],
  );
  const visible = useMemo(
    () => filterActivity(activity.data ?? [], filter),
    [activity.data, filter],
  );

  return (
    <section aria-labelledby="activity-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="activity-heading" className="text-lg font-semibold">
          Activity
        </h2>
        <div className="w-full sm:w-64">
          <SelectField
            label="Show"
            value={filter}
            onChange={(event) => {
              const value = event.target.value;
              if (isActivityFilter(value)) setFilter(value);
            }}
          >
            {ACTIVITY_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      {activity.isError ? (
        <div className="space-y-3">
          <Alert tone="error">The activity could not be loaded.</Alert>
          <Button variant="secondary" onClick={() => void activity.refetch()}>
            Try again
          </Button>
        </div>
      ) : activity.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading activity...
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filter === "all" ? "Nothing has happened yet." : "No activity matches this filter."}
        </p>
      ) : (
        <ol className="space-y-4">
          {visible.map((event) => (
            <ActivityEntry key={event.id} event={event} actor={actorName(event.actorId, names)} />
          ))}
        </ol>
      )}
    </section>
  );
}
