import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface p-4 lg:flex">
      <Brand />
      <NavLinks label="Main" />
    </aside>
  );
}
