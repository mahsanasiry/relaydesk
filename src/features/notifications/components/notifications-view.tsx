"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { actorName } from "@/features/activity/describe";
import { useMembers } from "@/features/members/queries";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";
import { describeDataError } from "@/lib/errors";
import { formatTimestamp } from "@/lib/utils/format";
import { countUnread, describeNotification } from "../model";
import { useMarkAllRead, useMarkRead, useNotifications } from "../queries";

export function NotificationsView() {
  const { notify } = useToast();
  const notifications = useNotifications();
  const members = useMembers();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const [error, setError] = useState<string | null>(null);

  const names = useMemo(
    () => new Map((members.data ?? []).map((member) => [member.id, member.displayName])),
    [members.data],
  );

  async function run(action: () => Promise<unknown>, message?: string) {
    setError(null);
    try {
      await action();
      if (message) notify("success", message);
    } catch (failure) {
      setError(describeDataError(failure));
    }
  }

  const failed = notifications.isError || members.isError;
  const loading = notifications.isPending || members.isPending;
  const unread = notifications.data ? countUnread(notifications.data) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <Button
          variant="secondary"
          disabled={unread === 0}
          loading={markAll.isPending}
          onClick={() => void run(() => markAll.mutateAsync(), "All notifications marked as read.")}
        >
          {markAll.isPending ? "Marking..." : "Mark all as read"}
        </Button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {failed ? (
        <div className="max-w-md space-y-3">
          <Alert tone="error" title="Notifications could not be loaded">
            Check your connection and try again.
          </Alert>
          <Button
            variant="secondary"
            onClick={() => {
              void notifications.refetch();
              void members.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : loading ? (
        <ListSkeleton />
      ) : notifications.data.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="font-medium">You are all caught up</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You are told when a request is assigned to you, when someone comments on your work, when
            a due date is close and when a blocked request is unblocked.
          </p>
        </div>
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {unread === 0 ? "No unread notifications." : `${unread} unread.`}
          </p>
          <ul className="space-y-3">
            {notifications.data.map((notification) => {
              const isUnread = notification.readAt === null;
              return (
                <li
                  key={notification.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2">
                      {isUnread ? (
                        <span className="rounded-full border border-primary px-2 py-0.5 text-xs font-medium text-primary">
                          Unread
                        </span>
                      ) : null}
                      <Link
                        href={`/app/requests/${notification.requestId}`}
                        onClick={() => {
                          if (isUnread)
                            void markRead.mutateAsync([notification.id]).catch(() => undefined);
                        }}
                        className="font-medium text-primary underline"
                      >
                        {notification.requestTitle ?? "Request"}
                      </Link>
                    </p>
                    <p className="text-sm">
                      {describeNotification(
                        notification.type,
                        notification.actorId === null
                          ? null
                          : actorName(notification.actorId, names),
                      )}
                    </p>
                    <time
                      dateTime={notification.createdAt}
                      className="text-xs text-muted-foreground"
                    >
                      {formatTimestamp(notification.createdAt)}
                    </time>
                  </div>
                  {isUnread ? (
                    <Button
                      variant="secondary"
                      disabled={markRead.isPending}
                      onClick={() => void run(() => markRead.mutateAsync([notification.id]))}
                    >
                      Mark as read
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
