import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/layout/brand";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10 sm:justify-center">
      <Link href="/" className="mb-6 inline-flex items-center gap-2.5 text-xl font-bold">
        <BrandMark />
        RelayDesk
      </Link>
      <main
        id="main"
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-card"
      >
        {children}
      </main>
    </div>
  );
}
