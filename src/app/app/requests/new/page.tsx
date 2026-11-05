import type { Metadata } from "next";
import Link from "next/link";
import { NewRequestView } from "@/features/requests/components/new-request-view";
import { isUuid } from "@/lib/utils/uuid";

export const metadata: Metadata = { title: "New request" };

export default async function NewRequestPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const { project } = await searchParams;

  return (
    <div className="max-w-2xl">
      <Link href="/app/requests" className="text-sm text-primary underline">
        Back to requests
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">New request</h1>
      <NewRequestView projectId={typeof project === "string" && isUuid(project) ? project : ""} />
    </div>
  );
}
