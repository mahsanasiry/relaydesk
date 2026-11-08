import Link from "next/link";

// Two points joined by a hand-off line: work passed from one person to the next.
export function BrandMark() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
      <svg viewBox="0 0 22 18" width="18" height="15" aria-hidden="true" focusable="false">
        <circle cx="4.5" cy="13.5" r="2.5" fill="currentColor" />
        <circle cx="17.5" cy="4.5" r="2.5" fill="currentColor" />
        <path
          d="M4.5 11C4.5 6.5 8 4.5 14.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function Brand() {
  return (
    <Link href="/app/dashboard" className="inline-flex items-center gap-2.5 text-lg font-bold">
      <BrandMark />
      RelayDesk
    </Link>
  );
}
