"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import type { ClientRow } from "@/features/clients/api";
import { describeDataError } from "@/lib/errors";
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  projectFormSchema,
} from "@/lib/validation/project";
import type { ProjectFormValues } from "@/lib/validation/project";
import { PROJECT_STATUS_LABELS } from "../labels";
import { PROJECT_STATUSES } from "../model";

interface ProjectFormProps {
  defaults: ProjectFormValues;
  clients: readonly ClientRow[];
  submitLabel: string;
  savingLabel: string;
  /** Rejecting shows the failure under the form. Resolving resets the form to what was saved. */
  onSubmit: (values: ProjectFormValues) => Promise<void>;
}

export function ProjectForm({
  defaults,
  clients,
  submitLabel,
  savingLabel,
  onSubmit,
}: ProjectFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
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
        label="Name"
        maxLength={PROJECT_NAME_MAX_LENGTH}
        error={errors.name?.message}
        {...register("name")}
      />
      <TextareaField
        label="Description"
        rows={4}
        maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
        error={errors.description?.message}
        {...register("description")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Status" {...register("status")}>
          {PROJECT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PROJECT_STATUS_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Client" {...register("clientId")}>
          <option value="">No client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Start date"
          type="date"
          error={errors.startDate?.message}
          {...register("startDate")}
        />
        <TextField
          label="End date"
          type="date"
          error={errors.endDate?.message}
          {...register("endDate")}
        />
      </div>
      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
        {isSubmitting ? savingLabel : submitLabel}
      </Button>
    </form>
  );
}
