"use client";

import Link from "next/link";
import { useUnreadCount } from "../queries";
import { formatBadgeCount } from "../model";

export function NotificationBell() {
  const unread = useUnreadCount();
  const count = unread.data ?? 0;

  return (
    <Link
      href="/app/notifications"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-muted"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
      </svg>
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 min-w-5 rounded-full bg-primary px-1 text-center text-xs font-medium text-primary-foreground"
        >
          {formatBadgeCount(count)}
        </span>
      ) : null}
    </Link>
  );
}
