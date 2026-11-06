import { z } from "zod";

export const COMMENT_MAX_LENGTH = 5000;

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a comment first.")
    .max(COMMENT_MAX_LENGTH, `Use ${COMMENT_MAX_LENGTH} characters or fewer.`),
});

export type CommentValues = z.infer<typeof commentSchema>;
