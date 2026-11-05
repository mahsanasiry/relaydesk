import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10 sm:justify-center">
      <Link href="/" className="mb-6 text-lg font-semibold">
        RelayDesk
      </Link>
      <main id="main" className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        {children}
      </main>
    </div>
  );
}
