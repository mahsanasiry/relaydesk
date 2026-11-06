import { ActivityEntry } from "@/features/activity/components/activity-entry";
import { actorName } from "@/features/activity/describe";
import type { ActivityEvent } from "@/features/activity/model";
import Link from "next/link";

export function RecentActivity({
  events,
  memberNames,
}: {
  events: readonly ActivityEvent[];
  memberNames: ReadonlyMap<string, string>;
}) {
  return (
    <section aria-labelledby="recent-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recent-heading" className="text-lg font-semibold">
          Recent activity
        </h2>
        <Link href="/app/activity" className="text-sm text-primary underline">
          All activity
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>
      ) : (
        <ol className="space-y-4">
          {events.map((event) => (
            <ActivityEntry
              key={event.id}
              event={event}
              actor={actorName(event.actorId, memberNames)}
              showRequest
            />
          ))}
        </ol>
      )}
    </section>
  );
}
