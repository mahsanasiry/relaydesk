import { z } from "zod";
import { BLOCKED_NOTE_MAX_LENGTH } from "@/features/requests/status-change";
import { REQUEST_PRIORITIES, REQUEST_STATUSES, isBlockedReason } from "@/features/requests/model";
import { isRealDate } from "@/lib/utils/date-input";

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 10_000;
export const LABEL_MAX_COUNT = 10;
export const LABEL_MAX_LENGTH = 30;

/** "ops, Urgent ,ops" becomes ["ops", "Urgent"]: trimmed, no blanks, no repeats ignoring case. */
export function parseLabels(text: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const part of text.split(",")) {
    const label = part.trim();
    const key = label.toLowerCase();
    if (label !== "" && !seen.has(key)) {
      seen.add(key);
      labels.push(label);
    }
  }
  return labels;
}

/**
 * Optional values are empty strings, not null, because that is what form controls hold. The
 * mapping to null happens once, in toRecord.
 */
export const requestFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Enter a title.")
      .max(TITLE_MAX_LENGTH, `Use ${TITLE_MAX_LENGTH} characters or fewer.`),
    description: z
      .string()
      .max(DESCRIPTION_MAX_LENGTH, `Use ${DESCRIPTION_MAX_LENGTH} characters or fewer.`),
    status: z.enum(REQUEST_STATUSES),
    priority: z.enum(REQUEST_PRIORITIES),
    assigneeId: z.string(),
    projectId: z.string(),
    dueDate: z.string().refine((value) => value === "" || isRealDate(value), "Enter a valid date."),
    labels: z.string(),
    blockedReason: z.string(),
    blockedNote: z
      .string()
      .max(BLOCKED_NOTE_MAX_LENGTH, `Use ${BLOCKED_NOTE_MAX_LENGTH} characters or fewer.`),
  })
  .superRefine((values, context) => {
    if (values.status === "blocked" && !isBlockedReason(values.blockedReason)) {
      context.addIssue({
        code: "custom",
        path: ["blockedReason"],
        message: "Choose why this request is blocked.",
      });
    }

    const labels = parseLabels(values.labels);
    if (labels.length > LABEL_MAX_COUNT) {
      context.addIssue({
        code: "custom",
        path: ["labels"],
        message: `Use at most ${LABEL_MAX_COUNT} labels.`,
      });
    } else if (labels.some((label) => label.length > LABEL_MAX_LENGTH)) {
      context.addIssue({
        code: "custom",
        path: ["labels"],
        message: `Keep each label to ${LABEL_MAX_LENGTH} characters or fewer.`,
      });
    }
  });

export type RequestFormValues = z.infer<typeof requestFormSchema>;
