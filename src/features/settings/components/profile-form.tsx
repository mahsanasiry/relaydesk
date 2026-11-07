"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { describeDataError } from "@/lib/errors";
import { DISPLAY_NAME_MAX_LENGTH, profileFormSchema } from "@/lib/validation/settings";
import type { ProfileFormValues } from "@/lib/validation/settings";

interface ProfileFormProps {
  defaults: ProfileFormValues;
  email: string;
  /** Rejecting shows the failure under the form. Resolving resets the form to what was saved. */
  onSubmit: (values: ProfileFormValues) => Promise<void>;
}

export function ProfileForm({ defaults, email, onSubmit }: ProfileFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
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
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        error={errors.displayName?.message}
        {...register("displayName")}
      />
      <TextField label="Email" value={email} readOnly hint="Your email is used to sign in." />
      <Button type="submit" disabled={!isDirty} loading={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save name"}
      </Button>
    </form>
  );
}
