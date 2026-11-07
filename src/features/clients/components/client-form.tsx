"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { describeDataError } from "@/lib/errors";
import {
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_NOTES_MAX_LENGTH,
  clientFormSchema,
} from "@/lib/validation/client";
import type { ClientFormValues } from "@/lib/validation/client";

interface ClientFormProps {
  defaults: ClientFormValues;
  submitLabel: string;
  savingLabel: string;
  onSubmit: (values: ClientFormValues) => Promise<void>;
}

export function ClientForm({ defaults, submitLabel, savingLabel, onSubmit }: ClientFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
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
        maxLength={CLIENT_NAME_MAX_LENGTH}
        error={errors.name?.message}
        {...register("name")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Contact name"
          maxLength={120}
          error={errors.contactName?.message}
          {...register("contactName")}
        />
        <TextField
          label="Contact phone"
          type="tel"
          maxLength={40}
          error={errors.contactPhone?.message}
          {...register("contactPhone")}
        />
      </div>
      <TextField
        label="Contact email"
        type="email"
        maxLength={254}
        error={errors.contactEmail?.message}
        {...register("contactEmail")}
      />
      <TextareaField
        label="Notes"
        rows={4}
        maxLength={CLIENT_NOTES_MAX_LENGTH}
        error={errors.notes?.message}
        {...register("notes")}
      />
      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
        {isSubmitting ? savingLabel : submitLabel}
      </Button>
    </form>
  );
}
