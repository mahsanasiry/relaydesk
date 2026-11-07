import { z } from "zod";
import { PROJECT_STATUSES } from "@/features/projects/model";
import { isRealDate } from "@/lib/utils/date-input";

export const PROJECT_NAME_MAX_LENGTH = 120;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 5000;

const dateField = z
  .string()
  .refine((value) => value === "" || isRealDate(value), "Enter a valid date.");

/** Optional values are empty strings, because that is what form controls hold. */
export const projectFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a project name.")
      .max(PROJECT_NAME_MAX_LENGTH, `Use ${PROJECT_NAME_MAX_LENGTH} characters or fewer.`),
    description: z
      .string()
      .max(
        PROJECT_DESCRIPTION_MAX_LENGTH,
        `Use ${PROJECT_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
      ),
    status: z.enum(PROJECT_STATUSES),
    clientId: z.string(),
    startDate: dateField,
    endDate: dateField,
  })
  .superRefine((values, context) => {
    const bothValid =
      values.startDate !== "" &&
      values.endDate !== "" &&
      isRealDate(values.startDate) &&
      isRealDate(values.endDate);
    // ISO dates sort the same way as the days they name.
    if (bothValid && values.endDate < values.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "The end date must be on or after the start date.",
      });
    }
  });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
