"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "./nav";

interface NavLinksProps {
  label: string;
  onNavigate?: () => void;
}

export function NavLinks({ label, onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isNavActive(pathname, item.href) ? "page" : undefined}
              onClick={onNavigate}
              className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-semibold"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
