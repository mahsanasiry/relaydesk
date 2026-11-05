import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
// The auth server hashes with bcrypt, which ignores everything after 72 bytes.
export const PASSWORD_MAX_LENGTH = 72;
export const DISPLAY_NAME_MAX_LENGTH = 80;

// One check with two messages: a separate min(1) would not stop the format check from also
// reporting on an empty field.
const email = z
  .string()
  .trim()
  .pipe(
    z.email({
      error: (issue) =>
        issue.input === "" ? "Enter your email address." : "Enter a valid email address.",
    }),
  );

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(DISPLAY_NAME_MAX_LENGTH, `Use ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
    .max(PASSWORD_MAX_LENGTH, `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
