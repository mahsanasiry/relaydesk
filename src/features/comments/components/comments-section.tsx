"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/textarea-field";
import { useToast } from "@/components/ui/toast";
import { actorName } from "@/features/activity/describe";
import { useCurrentUser } from "@/features/auth/current-user";
import { useMembers } from "@/features/members/queries";
import { describeDataError } from "@/lib/errors";
import { formatTimestamp } from "@/lib/utils/format";
import { COMMENT_MAX_LENGTH, commentSchema } from "@/lib/validation/comment";
import type { CommentValues } from "@/lib/validation/comment";
import { useAddComment, useComments } from "../queries";

export function CommentsSection({ requestId }: { requestId: string }) {
  const user = useCurrentUser();
  const { notify } = useToast();
  const comments = useComments(requestId);
  const members = useMembers();
  const add = useAddComment(requestId, user.workspaceId);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "" },
  });

  const names = useMemo(
    () => new Map((members.data ?? []).map((member) => [member.id, member.displayName])),
    [members.data],
  );

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await add.mutateAsync(values.body);
      reset({ body: "" });
      notify("success", "Comment added.");
    } catch (error) {
      // The text stays in the box so a failed send never loses what was written.
      setFormError(describeDataError(error));
    }
  });

  return (
    <section aria-labelledby="comments-heading" className="space-y-4">
      <h2 id="comments-heading" className="text-lg font-semibold">
        Comments
      </h2>

      {comments.isError ? (
        <div className="space-y-3">
          <Alert tone="error">The comments could not be loaded.</Alert>
          <Button variant="secondary" onClick={() => void comments.refetch()}>
            Try again
          </Button>
        </div>
      ) : comments.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading comments...
        </p>
      ) : comments.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.data.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm">
                <span className="font-medium">{actorName(comment.authorId, names)}</span>{" "}
                <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
                  {formatTimestamp(comment.createdAt)}
                </time>
              </p>
              <p className="mt-2 text-sm whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} noValidate className="space-y-3">
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        <TextareaField
          label="Add a comment"
          rows={3}
          maxLength={COMMENT_MAX_LENGTH}
          error={errors.body?.message}
          {...register("body")}
        />
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add comment"}
        </Button>
      </form>
    </section>
  );
}
