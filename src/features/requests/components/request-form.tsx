"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import type { Member } from "@/features/members/queries";
import type { ProjectOption } from "@/features/projects/queries";
import { describeDataError } from "@/lib/errors";
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  requestFormSchema,
} from "@/lib/validation/request";
import type { RequestFormValues } from "@/lib/validation/request";
import { BLOCKED_REASON_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "../labels";
import { BLOCKED_REASONS, REQUEST_PRIORITIES, REQUEST_STATUSES } from "../model";
import { BLOCKED_NOTE_MAX_LENGTH } from "../status-change";

interface RequestFormProps {
  defaults: RequestFormValues;
  members: readonly Member[];
  projects: readonly ProjectOption[];
  submitLabel: string;
  savingLabel: string;
  /** Rejecting shows the failure under the form. Resolving resets the form to what was saved. */
  onSubmit: (values: RequestFormValues) => Promise<void>;
}

export function RequestForm({
  defaults,
  members,
  projects,
  submitLabel,
  savingLabel,
  onSubmit,
}: RequestFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: defaults,
  });
  const status = useWatch({ control, name: "status" });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
      reset(values);
    } catch (error) {
      setFormError(describeDataError(error));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <TextField
        label="Title"
        maxLength={TITLE_MAX_LENGTH}
        error={errors.title?.message}
        {...register("title")}
      />
      <TextareaField
        label="Description"
        rows={5}
        maxLength={DESCRIPTION_MAX_LENGTH}
        error={errors.description?.message}
        {...register("description")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Status" {...register("status")}>
          {REQUEST_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Priority" {...register("priority")}>
          {REQUEST_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </SelectField>
      </div>

      {status === "blocked" ? (
        <fieldset className="space-y-4 rounded-md border border-danger p-4">
          <legend className="px-1 text-sm font-medium">Why is this blocked?</legend>
          <div>
            <SelectField label="Reason" {...register("blockedReason")}>
              <option value="">Choose a reason</option>
              {BLOCKED_REASONS.map((value) => (
                <option key={value} value={value}>
                  {BLOCKED_REASON_LABELS[value]}
                </option>
              ))}
            </SelectField>
            {errors.blockedReason?.message ? (
              <p className="mt-1 text-sm text-danger">{errors.blockedReason.message}</p>
            ) : null}
          </div>
          <TextareaField
            label="Note (optional)"
            rows={3}
            maxLength={BLOCKED_NOTE_MAX_LENGTH}
            error={errors.blockedNote?.message}
            {...register("blockedNote")}
          />
        </fieldset>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Assignee" {...register("assigneeId")}>
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </SelectField>
        <SelectField label="Project" {...register("projectId")}>
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Due date"
          type="date"
          error={errors.dueDate?.message}
          {...register("dueDate")}
        />
        <TextField
          label="Labels"
          hint="Separate with commas."
          error={errors.labels?.message}
          {...register("labels")}
        />
      </div>

      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
        {isSubmitting ? savingLabel : submitLabel}
      </Button>
    </form>
  );
}
