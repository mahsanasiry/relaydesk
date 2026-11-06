import Link from "next/link";
import { formatTimestamp } from "@/lib/utils/format";
import { describeActivityAction } from "../describe";
import type { ActivityEvent } from "../model";

interface ActivityEntryProps {
  event: ActivityEvent;
  actor: string;
  /** Shown on pages that list events from many requests. */
  showRequest?: boolean;
}

export function ActivityEntry({ event, actor, showRequest = false }: ActivityEntryProps) {
  return (
    <li className="border-l-2 border-border pl-4">
      <p className="text-sm">
        <span className="font-medium">{actor}</span> {describeActivityAction(event)}
      </p>
      {showRequest ? (
        <p className="text-sm">
          {event.requestId ? (
            <Link href={`/app/requests/${event.requestId}`} className="text-primary underline">
              {event.requestTitle}
            </Link>
          ) : (
            <span>{event.requestTitle} (deleted)</span>
          )}
        </p>
      ) : null}
      <time dateTime={event.createdAt} className="text-xs text-muted-foreground">
        {formatTimestamp(event.createdAt)}
      </time>
    </li>
  );
}
