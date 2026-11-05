"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH, signupSchema } from "@/lib/validation/auth";
import type { SignupValues } from "@/lib/validation/auth";
import { signUpAction } from "./actions";

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await signUpAction(values);

    if (result.status === "success") {
      setRedirecting(true);
      router.replace(result.redirectTo);
      router.refresh();
      return;
    }
    if (result.status === "confirm_email") {
      setConfirmationEmail(values.email);
      return;
    }
    if (result.field) {
      setError(result.field, { message: result.message }, { shouldFocus: true });
      return;
    }
    setFormError(result.message);
  });

  if (confirmationEmail) {
    return (
      <Alert tone="info" title="Check your email">
        We sent a confirmation link to {confirmationEmail}. Open it, then log in.
      </Alert>
    );
  }

  const busy = isSubmitting || redirecting;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      <TextField
        label="Name"
        autoComplete="name"
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        error={errors.displayName?.message}
        {...register("displayName")}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" loading={busy} className="w-full">
        {busy ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
