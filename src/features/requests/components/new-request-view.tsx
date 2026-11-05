"use client";

import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/auth/current-user";
import { useMembers } from "@/features/members/queries";
import { useProjects } from "@/features/projects/queries";
import type { RequestFormValues } from "@/lib/validation/request";
import { useCreateRequest } from "../detail-queries";
import { emptyFormValues } from "../payload";
import { ListSkeleton } from "./list-skeleton";
import { RequestForm } from "./request-form";

export function NewRequestView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const user = useCurrentUser();
  const members = useMembers();
  const projects = useProjects();
  const create = useCreateRequest(user.workspaceId);

  if (members.isError || projects.isError) {
    return (
      <div className="max-w-md space-y-3">
        <Alert tone="error" title="The form could not be loaded">
          Check your connection and try again.
        </Alert>
        <Button
          variant="secondary"
          onClick={() => {
            void members.refetch();
            void projects.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (members.isPending || projects.isPending) {
    return <ListSkeleton />;
  }

  // An unknown project id in the link is ignored rather than failing the save later.
  const knownProject = projects.data.some((project) => project.id === projectId);

  async function submit(values: RequestFormValues) {
    const created = await create.mutateAsync(values);
    notify("success", "Request created.");
    router.push(`/app/requests/${created.id}`);
  }

  return (
    <RequestForm
      defaults={emptyFormValues(knownProject ? projectId : "")}
      members={members.data}
      projects={projects.data}
      submitLabel="Create request"
      savingLabel="Creating..."
      onSubmit={submit}
    />
  );
}
