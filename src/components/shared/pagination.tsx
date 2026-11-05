import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}

export function Pagination({ page, pageCount, hrefFor }: PaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} rel="prev" className={buttonClassName("secondary")}>
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={buttonClassName("secondary", "opacity-60")}>
            Previous
          </span>
        )}
        {page < pageCount ? (
          <Link href={hrefFor(page + 1)} rel="next" className={buttonClassName("secondary")}>
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className={buttonClassName("secondary", "opacity-60")}>
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
