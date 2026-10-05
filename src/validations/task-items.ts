import { z } from "zod";

const title = z.string().trim().min(1, "Title is required.").max(200);

export const createItemSchema = z.object({ title });

export const updateSubtaskSchema = z
  .object({ title: title.optional(), completed: z.boolean().optional() })
  .refine((v) => v.title !== undefined || v.completed !== undefined, "Nothing to update.");

export const updateChecklistItemSchema = z
  .object({ title: title.optional(), checked: z.boolean().optional() })
  .refine((v) => v.title !== undefined || v.checked !== undefined, "Nothing to update.");

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, "Name required.").max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #6366f1.")
    .optional(),
});

export const createTimeEntrySchema = z.object({
  minutes: z.coerce
    .number()
    .min(1, "Minutes must be at least 1.")
    .max(24 * 60, "A single entry can't exceed 24 hours."),
  note: z.string().trim().max(500).optional().nullable(),
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Content is required.").max(5000),
});

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input";
}
