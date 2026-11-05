export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/requests", label: "Requests" },
  { href: "/app/projects", label: "Projects" },
  { href: "/app/clients", label: "Clients" },
  { href: "/app/activity", label: "Activity" },
  { href: "/app/notifications", label: "Notifications" },
  { href: "/app/settings", label: "Settings" },
];

/** A section stays highlighted on its detail and create pages, for example /app/requests/new. */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
