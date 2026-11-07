"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { describeDataError } from "@/lib/errors";
import {
  DUE_WINDOW_RANGE,
  WAITING_THRESHOLD_RANGE,
  WORKSPACE_NAME_MAX_LENGTH,
  workspaceFormSchema,
} from "@/lib/validation/settings";
import type { WorkspaceFormValues } from "@/lib/validation/settings";

interface WorkspaceFormProps {
  defaults: WorkspaceFormValues;
  /** Rejecting shows the failure under the form. Resolving resets the form to what was saved. */
  onSubmit: (values: WorkspaceFormValues) => Promise<void>;
}

export function WorkspaceForm({ defaults, onSubmit }: WorkspaceFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: defaults,
  });

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
        label="Workspace name"
        maxLength={WORKSPACE_NAME_MAX_LENGTH}
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label="Waiting threshold (days)"
        inputMode="numeric"
        hint={`A request that has been Waiting this long needs attention. ${WAITING_THRESHOLD_RANGE.min} to ${WAITING_THRESHOLD_RANGE.max}.`}
        error={errors.waitingThresholdDays?.message}
        {...register("waitingThresholdDays")}
      />
      <TextField
        label="Due window (days)"
        inputMode="numeric"
        hint={`High priority requests due within this many days need attention, and assignees are notified. ${DUE_WINDOW_RANGE.min} to ${DUE_WINDOW_RANGE.max}.`}
        error={errors.dueWindowDays?.message}
        {...register("dueWindowDays")}
      />
      <Button type="submit" disabled={!isDirty} loading={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
