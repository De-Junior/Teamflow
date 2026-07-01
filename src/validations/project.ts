import { z } from "zod";
import { Priority, ProjectStatus, TaskStatus } from "@prisma/client";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(ProjectStatus).default("ACTIVE"),
  priority: z.nativeEnum(Priority).default("MEDIUM"),
  startDate: z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().datetime().optional().nullable()
),
dueDate: z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().datetime().optional().nullable()
),
});

export const updateProjectSchema = createProjectSchema.partial();

export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(5000).optional(),
  status: z.nativeEnum(TaskStatus).default("BACKLOG"),
  priority: z.nativeEnum(Priority).default("MEDIUM"),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
  projectId: z.string().cuid(),
});

export const updateTaskSchema = createTaskSchema.partial().omit({ projectId: true });

export const reorderTasksSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().cuid(),
      status: z.nativeEnum(TaskStatus),
      position: z.number().int().min(0),
    })
  ),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;
export type CreateProjectFormInput = z.input<typeof createProjectSchema>;
export type CreateTaskFormInput = z.input<typeof createTaskSchema>;