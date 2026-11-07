import { z } from "zod";

export const CLIENT_NAME_MAX_LENGTH = 120;
export const CLIENT_NOTES_MAX_LENGTH = 2000;

export const clientFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a client name.")
    .max(CLIENT_NAME_MAX_LENGTH, `Use ${CLIENT_NAME_MAX_LENGTH} characters or fewer.`),
  contactName: z.string().trim().max(120, "Use 120 characters or fewer."),
  contactEmail: z
    .string()
    .trim()
    .max(254, "Use 254 characters or fewer.")
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "Enter a valid email address.",
    ),
  contactPhone: z.string().trim().max(40, "Use 40 characters or fewer."),
  notes: z
    .string()
    .max(CLIENT_NOTES_MAX_LENGTH, `Use ${CLIENT_NOTES_MAX_LENGTH} characters or fewer.`),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
