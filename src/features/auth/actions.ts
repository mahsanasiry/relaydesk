"use server";

import { redirect } from "next/navigation";
import { APP_HOME, LOGIN_PATH, safeNextPath } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import { describeAuthError } from "./errors";
import type { AuthActionResult, AuthField } from "./types";

const FIELDS: readonly string[] = ["displayName", "email", "password"];

// The client validates too, but a server action is a public endpoint and cannot trust it.
function invalidInput(issue: { path: PropertyKey[]; message: string } | undefined) {
  const key = issue?.path[0];
  const field = typeof key === "string" && FIELDS.includes(key) ? (key as AuthField) : undefined;
  const result: AuthActionResult = {
    status: "error",
    message: issue?.message ?? "Check the details and try again.",
    ...(field ? { field } : {}),
  };
  return result;
}

export async function signInAction(input: unknown, next: string | null): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error.issues[0]);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", ...describeAuthError(error) };
  }

  return { status: "success", redirectTo: safeNextPath(next) };
}

export async function signUpAction(input: unknown): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error.issues[0]);
  }

  const { displayName, email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) {
    return { status: "error", ...describeAuthError(error) };
  }

  // With email confirmation on, signing up an existing address returns a user with no
  // identities instead of an error, so that accounts cannot be probed.
  if (data.user?.identities?.length === 0) {
    return { status: "error", ...describeAuthError({ code: "user_already_exists" }) };
  }
  if (!data.session) {
    return { status: "confirm_email" };
  }

  return { status: "success", redirectTo: APP_HOME };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}
