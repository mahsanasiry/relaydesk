import type { ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function AppShell({ userName, children }: { userName: string; children: ReactNode }) {
  return (
    <div className="lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Header userName={userName} />
        <main id="main" className="px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
