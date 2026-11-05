"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { loginSchema } from "@/lib/validation/auth";
import type { LoginValues } from "@/lib/validation/auth";
import { signInAction } from "./actions";

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await signInAction(values, next);

    if (result.status === "success") {
      // Stay disabled until the page changes so a second click cannot start another sign-in.
      setRedirecting(true);
      router.replace(result.redirectTo);
      router.refresh();
      return;
    }
    setFormError(result.status === "error" ? result.message : "Could not log you in.");
  });

  const busy = isSubmitting || redirecting;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}
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
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" loading={busy} className="w-full">
        {busy ? "Logging in..." : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-primary underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
