"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useMembers } from "@/features/members/queries";
import { useProjects } from "@/features/projects/queries";
import { describeDataError } from "@/lib/errors";
import { formatTimestamp } from "@/lib/utils/format";
import type { RequestFormValues } from "@/lib/validation/request";
import { useDeleteRequest, useRequestDetail, useUpdateRequest } from "../detail-queries";
import { describeDue } from "../due-label";
import { BLOCKED_REASON_LABELS } from "../labels";
import { toFormValues } from "../payload";
import { StatusBadge } from "./badges";
import { ListSkeleton } from "./list-skeleton";
import { RelatedRequests } from "./related-requests";
import { RequestForm } from "./request-form";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

export function RequestDetail({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const detail = useRequestDetail(requestId);
  const members = useMembers();
  const projects = useProjects();
  const update = useUpdateRequest(requestId);
  const remove = useDeleteRequest(requestId);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (detail.isError || members.isError || projects.isError) {
    return (
      <div className="max-w-md space-y-3">
        <Alert tone="error" title="This request could not be loaded">
          Check your connection and try again.
        </Alert>
        <Button
          variant="secondary"
          onClick={() => {
            void detail.refetch();
            void members.refetch();
            void projects.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (detail.isPending || members.isPending || projects.isPending) {
    return <ListSkeleton />;
  }

  const request = detail.data;
  if (request === null) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">Request not found</h1>
        <p className="mt-2 text-muted-foreground">
          It may have been deleted, or you may not have access to it.
        </p>
        <Link href="/app/requests" className={`${buttonClassName("secondary")} mt-4`}>
          Back to requests
        </Link>
      </div>
    );
  }

  const memberList = members.data;
  const memberName = (id: string | null) =>
    id === null ? null : (memberList.find((member) => member.id === id)?.displayName ?? null);
  const due = describeDue(request.dueDate, request.status, new Date(detail.dataUpdatedAt));

  async function save(values: RequestFormValues) {
    await update.mutateAsync(values);
    notify("success", "Request saved.");
  }

  async function confirmDelete() {
    setDeleteError(null);
    try {
      await remove.mutateAsync();
      notify("success", "Request deleted.");
      router.replace("/app/requests");
    } catch (error) {
      setConfirming(false);
      setDeleteError(describeDataError(error));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/requests" className="text-sm text-primary underline">
          Back to requests
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{request.title}</h1>
          <StatusBadge status={request.status} />
        </div>
        {request.blockedReason ? (
          <p className="mt-1 text-sm text-danger">
            Blocked: {BLOCKED_REASON_LABELS[request.blockedReason]}
          </p>
        ) : null}
      </div>

      {deleteError ? <Alert tone="error">{deleteError}</Alert> : null}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <section aria-labelledby="edit-heading">
            <h2 id="edit-heading" className="mb-4 text-lg font-semibold">
              Details
            </h2>
            <RequestForm
              defaults={toFormValues(request)}
              members={members.data}
              projects={projects.data}
              submitLabel="Save changes"
              savingLabel="Saving..."
              onSubmit={save}
            />
          </section>
          <RelatedRequests requestId={requestId} />
          <CommentsSection requestId={requestId} />
          <ActivityTimeline requestId={requestId} />
        </div>

        <aside aria-labelledby="facts-heading" className="space-y-4">
          <h2 id="facts-heading" className="text-lg font-semibold">
            About this request
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <Fact label="Created">{formatTimestamp(request.createdAt)}</Fact>
            <Fact label="Created by">{memberName(request.createdBy) ?? "Unknown"}</Fact>
            <Fact label="Last updated">{formatTimestamp(request.updatedAt)}</Fact>
            <Fact label="In this status since">{formatTimestamp(request.statusChangedAt)}</Fact>
            {due.date ? (
              <Fact label="Due">
                {due.date}
                {due.note ? (
                  <span
                    className={`block ${due.overdue ? "font-medium text-danger" : "text-muted-foreground"}`}
                  >
                    {due.note}
                  </span>
                ) : null}
              </Fact>
            ) : null}
          </dl>
          <div className="border-t border-border pt-4">
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Delete request
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Delete this request?"
        description="Its comments and links are deleted with it. This cannot be undone."
        confirmLabel="Delete"
        busyLabel="Deleting..."
        busy={remove.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
