import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/features/projects/components/project-detail";
import { isUuid } from "@/lib/utils/uuid";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({
  params,
}: Readonly<{ params: Promise<{ projectId: string }> }>) {
  const { projectId } = await params;
  if (!isUuid(projectId)) {
    notFound();
  }

  return <ProjectDetail projectId={projectId} />;
}
