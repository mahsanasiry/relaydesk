import type { Metadata } from "next";
import Link from "next/link";
import { NewProjectView } from "@/features/projects/components/new-project-view";
import { isUuid } from "@/lib/utils/uuid";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { client } = await searchParams;

  return (
    <div className="max-w-2xl">
      <Link href="/app/projects" className="text-sm text-primary underline">
        Back to projects
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">New project</h1>
      <NewProjectView clientId={typeof client === "string" && isUuid(client) ? client : ""} />
    </div>
  );
}
