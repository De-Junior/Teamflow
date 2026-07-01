// PASTE LOCATION: src/validations/file.ts (new file)

import { z } from "zod";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/s3/s3";

export const presignFileSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    contentType: z.enum(ALLOWED_MIME_TYPES, {
      error: "File type is not supported.",
    }),
    size: z
      .number()
      .int()
      .positive()
      .max(MAX_FILE_SIZE_BYTES, "File exceeds the 25MB upload limit."),
    projectId: z.string().cuid().optional(),
    taskId: z.string().cuid().optional(),
  })
  .refine((data) => Boolean(data.projectId || data.taskId), {
    message: "A projectId or taskId is required.",
  });

export const confirmFileSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1).max(255),
  projectId: z.string().cuid().optional(),
  taskId: z.string().cuid().optional(),
});

export type PresignFileInput = z.infer<typeof presignFileSchema>;
export type ConfirmFileInput = z.infer<typeof confirmFileSchema>;