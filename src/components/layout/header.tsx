import Link from "next/link";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { SEARCH_MAX_LENGTH } from "@/features/requests/filters";
import { MobileNav } from "./mobile-nav";

export function Header({ userName }: { userName: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface px-4 py-2 sm:px-6">
      <MobileNav userName={userName} />
      {/* A plain GET form: the query lands in the requests list URL, which owns the filters. */}
      <form action="/app/requests" role="search" className="min-w-0 flex-1 sm:max-w-md">
        <label htmlFor="global-search" className="sr-only">
          Search requests
        </label>
        <input
          id="global-search"
          name="q"
          type="search"
          maxLength={SEARCH_MAX_LENGTH}
          placeholder="Search requests"
          className="block min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
        />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/app/notifications"
          aria-label="Notifications"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-muted"
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
        </Link>
        <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">
          {userName}
        </span>
        <div className="hidden lg:block">
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
