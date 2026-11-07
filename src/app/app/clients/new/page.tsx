import type { Metadata } from "next";
import Link from "next/link";
import { NewClientView } from "@/features/clients/components/new-client-view";

export const metadata: Metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/app/clients" className="text-sm text-primary underline">
        Back to clients
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">New client</h1>
      <NewClientView />
    </div>
  );
}
