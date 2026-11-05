import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you asked for does not exist, or you do not have access to it.
      </p>
      <Link href="/app/dashboard" className={`${buttonClassName("primary")} mt-6`}>
        Go to the dashboard
      </Link>
    </main>
  );
}
