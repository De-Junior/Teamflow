import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Permission } from "@/lib/auth/permissions";
import { notFound } from "./errors";
import { parseId } from "./request";
import { authorize, requireActor, type Actor } from "./session";

/**
 * Guard for the task sub-resource routes (subtasks, checklist, labels, time
 * entries, comments).
 *
 * Those child tables don't carry their own `tenantId`, so tenant isolation is
 * enforced through the parent task: the task must belong to the caller's
 * tenant, and every child lookup is then scoped by `taskId`. An id from
 * another organization resolves to "not found".
 */
export async function requireTaskAccess(
  rawTaskId: string,
  permission?: Permission
): Promise<{ actor: Actor; taskId: string }> {
  const actor = await requireActor();
  if (permission) authorize(actor, permission);

  const taskId = parseId(rawTaskId, "taskId");
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId: actor.tenant.tenantId },
    select: { id: true },
  });
  if (!task) throw notFound("Task");

  return { actor, taskId };
}

/** True for roles that may moderate other people's comments and time entries. */
export function canModerate(role: string) {
  return role === Role.SUPER_ADMIN || role === Role.OWNER || role === Role.MANAGER;
}
