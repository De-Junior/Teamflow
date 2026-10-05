import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

/**
 * Guards for the task sub-resource routes (subtasks, checklist, labels,
 * time entries, comments).
 *
 * Those child tables don't carry their own `tenantId`, so tenant isolation is
 * enforced through the parent task: every lookup is filtered by
 * `task: { tenantId }`, which means an ID from another organisation simply
 * resolves to "not found".
 */

export type TaskAccess =
  | { ok: true; session: Session; tenantId: string; taskId: string }
  | { ok: false; response: NextResponse };

export function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

/**
 * Authenticates the caller, checks an optional permission, and confirms the
 * task belongs to the caller's tenant.
 */
export async function requireTaskAccess(
  taskId: string,
  permission?: Permission
): Promise<TaskAccess> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }

  if (permission && !hasPermission(session.user.role as Role, permission)) {
    return { ok: false, response: jsonError(`Insufficient permissions: requires "${permission}"`, 403) };
  }

  const tenantId = session.user.tenantId;
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
    select: { id: true },
  });
  if (!task) {
    return { ok: false, response: jsonError("Task not found", 404) };
  }

  return { ok: true, session, tenantId, taskId };
}

/** True for roles that may moderate other people's comments and time entries. */
export function canModerate(role: string) {
  return role === Role.SUPER_ADMIN || role === Role.OWNER || role === Role.MANAGER;
}

/** Parses a JSON body without throwing on malformed input. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
