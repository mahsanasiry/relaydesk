import { z } from "zod";

export const WORKSPACE_NAME_MAX_LENGTH = 80;
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const WAITING_THRESHOLD_RANGE = { min: 1, max: 60 } as const;
export const DUE_WINDOW_RANGE = { min: 1, max: 30 } as const;

// The inputs hold text, so the number is checked as text and converted when saving.
function wholeNumber(range: { min: number; max: number }) {
  return z
    .string()
    .trim()
    .refine(
      (value) => /^\d+$/.test(value) && Number(value) >= range.min && Number(value) <= range.max,
      {
        error: `Enter a whole number from ${range.min} to ${range.max}.`,
      },
    );
}

export const profileFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(
      DISPLAY_NAME_MAX_LENGTH,
      `Keep your name to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    ),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const workspaceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a workspace name.")
    .max(
      WORKSPACE_NAME_MAX_LENGTH,
      `Keep the name to ${WORKSPACE_NAME_MAX_LENGTH} characters or fewer.`,
    ),
  waitingThresholdDays: wholeNumber(WAITING_THRESHOLD_RANGE),
  dueWindowDays: wholeNumber(DUE_WINDOW_RANGE),
});
export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;
