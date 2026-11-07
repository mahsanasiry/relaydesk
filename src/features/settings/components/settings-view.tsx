"use client";

import { useRouter } from "next/navigation";
import { LoadFailed } from "@/components/shared/load-failed";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/auth/current-user";
import { ListSkeleton } from "@/features/requests/components/list-skeleton";
import type { ProfileFormValues, WorkspaceFormValues } from "@/lib/validation/settings";
import { toWorkspaceFormValues } from "../api";
import { useUpdateDisplayName, useUpdateWorkspace, useWorkspaceDetails } from "../queries";
import { ProfileForm } from "./profile-form";
import { WorkspaceForm } from "./workspace-form";

export function SettingsView({ email }: { email: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const user = useCurrentUser();
  const workspace = useWorkspaceDetails();
  const updateWorkspace = useUpdateWorkspace(user.workspaceId);
  const updateName = useUpdateDisplayName(user.id);

  async function saveName(values: ProfileFormValues) {
    await updateName.mutateAsync(values);
    notify("success", "Name saved.");
    // The header shows the name from the server layout, so it is read again.
    router.refresh();
  }

  async function saveWorkspace(values: WorkspaceFormValues) {
    await updateWorkspace.mutateAsync(values);
    notify("success", "Settings saved.");
  }

  return (
    <div className="max-w-2xl space-y-10">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section aria-labelledby="profile-heading" className="space-y-4">
        <h2 id="profile-heading" className="text-lg font-semibold">
          Profile
        </h2>
        <ProfileForm
          defaults={{ displayName: user.displayName }}
          email={email}
          onSubmit={saveName}
        />
      </section>

      <section aria-labelledby="workspace-heading" className="space-y-4">
        <h2 id="workspace-heading" className="text-lg font-semibold">
          Workspace
        </h2>
        {workspace.isError ? (
          <LoadFailed
            title="The workspace settings could not be loaded"
            onRetry={() => void workspace.refetch()}
          />
        ) : workspace.isPending ? (
          <ListSkeleton />
        ) : (
          <WorkspaceForm
            defaults={toWorkspaceFormValues(workspace.data)}
            onSubmit={saveWorkspace}
          />
        )}
      </section>
    </div>
  );
}
