import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { SEARCH_MAX_LENGTH } from "@/features/requests/filters";
import { MobileNav } from "./mobile-nav";

export function Header({ userName }: { userName: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/85 px-4 py-2 backdrop-blur sm:px-6">
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
          className="block min-h-11 w-full rounded-lg border border-border bg-muted px-3 text-sm transition-colors placeholder:text-muted-foreground focus:bg-surface"
        />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
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
