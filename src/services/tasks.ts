import { TaskStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  createNotification,
  getUserMembership,
  projectRepository,
  taskRepository,
  writeAuditLog,
} from "@/lib/db/tenant";
import { sendTaskAssignedEmail } from "@/lib/email/send";
import { authorize, type Actor } from "@/lib/api/session";
import { notFound, validationFailed } from "@/lib/api/errors";
import type { CreateTaskInput, ReorderTasksInput, UpdateTaskInput } from "@/validations/project";

/**
 * Task business rules. Route handlers parse input and call these; everything
 * about who may do what to a task, and what happens as a result, lives here.
 */

const taskDetailSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, name: true, image: true } },
  creator: { select: { id: true, name: true } },
  labels: { select: { id: true, name: true, color: true } },
} satisfies Prisma.TaskSelect;

export async function getTask(actor: Actor, id: string) {
  const task = await taskRepository(actor.tenant).findById(id, { select: taskDetailSelect });
  if (!task) throw notFound("Task");
  return task;
}

/** completedAt follows status: set when a task enters Done, cleared when it leaves. */
function completionFields(status: TaskStatus | undefined, previous?: TaskStatus) {
  if (status === undefined || status === previous) return {};
  return { completedAt: status === TaskStatus.DONE ? new Date() : null };
}

async function assertAssignable(actor: Actor, assigneeId: string) {
  const membership = await getUserMembership(assigneeId, actor.tenant.organizationId);
  if (!membership) throw validationFailed({ assigneeId: "Assignee must be a member of this organization." });
}

export async function createTask(actor: Actor, input: CreateTaskInput) {
  authorize(actor, "task:create");
  const { dueDate, assigneeId, projectId, ...rest } = input;

  const project = await projectRepository(actor.tenant).findById(projectId, { select: { id: true, name: true } });
  if (!project) throw notFound("Project");
  if (assigneeId) {
    authorize(actor, "task:assign");
    await assertAssignable(actor, assigneeId);
  }

  // New tasks go to the bottom of their column.
  const last = await prisma.task.findFirst({
    where: { tenantId: actor.tenant.tenantId, projectId, status: rest.status },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const task = await taskRepository(actor.tenant).create({
    ...rest,
    position: (last?.position ?? -1) + 1,
    dueDate: dueDate ? new Date(dueDate) : null,
    ...completionFields(rest.status),
    project: { connect: { id: projectId } },
    ...(assigneeId && { assignee: { connect: { id: assigneeId } } }),
  });

  await writeAuditLog(actor.tenant, {
    action: "CREATED",
    entityType: "Task",
    entityId: task.id,
    metadata: { title: task.title, projectId },
  });

  if (assigneeId) await notifyAssignee(actor, { taskId: task.id, title: task.title, project, assigneeId });
  return task;
}

export async function updateTask(actor: Actor, id: string, input: UpdateTaskInput) {
  authorize(actor, "task:update");
  const { dueDate, assigneeId, ...rest } = input;

  const existing = await taskRepository(actor.tenant).findById(id, {
    select: { title: true, status: true, assigneeId: true, project: { select: { id: true, name: true } } },
  });
  if (!existing) throw notFound("Task");

  const nextAssignee = assigneeId === undefined ? undefined : assigneeId || null;
  const reassigning = nextAssignee !== undefined && nextAssignee !== existing.assigneeId;
  if (reassigning) {
    authorize(actor, "task:assign");
    if (nextAssignee) await assertAssignable(actor, nextAssignee);
  }

  // updateMany only takes scalar fields, so the assignee is set by foreign key.
  const result = await taskRepository(actor.tenant).update(id, {
    ...rest,
    ...completionFields(rest.status, existing.status),
    ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    ...(reassigning && { assigneeId: nextAssignee }),
  });
  if (result.count === 0) throw notFound("Task");

  await writeAuditLog(actor.tenant, { action: "UPDATED", entityType: "Task", entityId: id, metadata: input });

  if (reassigning && nextAssignee) {
    await notifyAssignee(actor, { taskId: id, title: rest.title ?? existing.title, project: existing.project, assigneeId: nextAssignee });
  }
  return getTask(actor, id);
}

export async function deleteTask(actor: Actor, id: string) {
  authorize(actor, "task:delete");
  const result = await taskRepository(actor.tenant).delete(id);
  if (result.count === 0) throw notFound("Task");
  await writeAuditLog(actor.tenant, { action: "DELETED", entityType: "Task", entityId: id });
  return { id };
}

/**
 * Persists a Kanban drag: new column and order for every task in the affected
 * columns. All ids must belong to this tenant, or nothing is written.
 */
export async function reorderTasks(actor: Actor, { tasks }: ReorderTasksInput) {
  authorize(actor, "task:update");
  const ids = tasks.map((t) => t.id);

  const current = await prisma.task.findMany({
    where: { id: { in: ids }, tenantId: actor.tenant.tenantId },
    select: { id: true, status: true },
  });
  if (current.length !== new Set(ids).size) throw notFound("Task");
  const previousStatus = new Map(current.map((t) => [t.id, t.status]));

  await prisma.$transaction(
    tasks.map(({ id, status, position }) =>
      prisma.task.updateMany({
        where: { id, tenantId: actor.tenant.tenantId },
        data: { status, position, ...completionFields(status, previousStatus.get(id)) },
      })
    )
  );
  return { updated: tasks.length };
}

/**
 * In-app notification plus email for a new assignee. Both are best effort
 * (they log and swallow their own failures), and assigning yourself sends nothing.
 */
async function notifyAssignee(
  actor: Actor,
  task: { taskId: string; title: string; project: { id: string; name: string }; assigneeId: string }
) {
  if (task.assigneeId === actor.userId) return;

  // Respect the assignee's notification preferences (no row means defaults: on).
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId: task.assigneeId },
    select: { taskAssignedNotif: true, emailNotifications: true },
  });
  if (preferences && !preferences.taskAssignedNotif) return;

  await createNotification({
    tenantId: actor.tenant.tenantId,
    organizationId: actor.tenant.organizationId,
    userId: task.assigneeId,
    type: "TASK_ASSIGNED",
    title: "Task assigned to you",
    body: `You were assigned "${task.title}" in ${task.project.name}`,
    entityId: task.taskId,
    entityType: "task",
  });

  const assignee = await prisma.user.findUnique({ where: { id: task.assigneeId }, select: { email: true, name: true } });
  if (!assignee || preferences?.emailNotifications === false) return;
  await sendTaskAssignedEmail({
    tenantId: actor.tenant.tenantId,
    to: assignee.email,
    assigneeName: assignee.name ?? "there",
    assignerName: actor.session.user.name ?? "A teammate",
    taskTitle: task.title,
    projectName: task.project.name,
    taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${task.project.id}`,
  });
}

