import Link from "next/link";
import { PROJECT_STATUSES } from "@/features/projects/model";
import type { ProjectStatus } from "@/features/projects/model";
import { PROJECT_STATUS_LABELS } from "@/features/projects/labels";

export function ProjectSummary({ counts }: { counts: Readonly<Record<ProjectStatus, number>> }) {
  return (
    <section aria-labelledby="projects-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="projects-heading" className="text-lg font-semibold">
          Projects
        </h2>
        <Link href="/app/projects" className="text-sm text-primary underline">
          View projects
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PROJECT_STATUSES.map((status) => (
          <div key={status} className="rounded-lg border border-border bg-surface p-4">
            <dt className="text-sm text-muted-foreground">{PROJECT_STATUS_LABELS[status]}</dt>
            <dd className="mt-1 text-2xl font-semibold">{counts[status]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
