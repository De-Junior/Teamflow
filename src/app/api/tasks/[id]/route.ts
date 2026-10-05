import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { taskRepository, writeAuditLog, createNotification, getUserMembership } from "@/lib/db/tenant";
import { hasPermission, requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { updateTaskSchema } from "@/validations/project";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendTaskAssignedEmail } from "@/lib/email/send";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  const task = await taskRepository(ctx).findById(id, {
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
      assignee: { select: { id: true, name: true, image: true } },
      creator: { select: { id: true, name: true } },
      labels: { select: { id: true, name: true, color: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: task });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "task:update");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const { id } = await params;
  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  try {
    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { dueDate, assigneeId, ...rest } = parsed.data;

    // Grab the current state before overwriting it — we need the previous
    // assigneeId to detect an actual reassignment vs. an unrelated update.
    const existingTask = await taskRepository(ctx).findById(id, {
      select: {
        title: true,
        assigneeId: true,
        project: { select: { id: true, name: true } },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
    }

    const isReassigning = assigneeId !== undefined && (assigneeId || null) !== existingTask.assigneeId;
    if (isReassigning && !hasPermission(session.user.role as Role, "task:assign")) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions: requires "task:assign"' },
        { status: 403 }
      );
    }

    if (assigneeId && !(await getUserMembership(assigneeId, ctx.organizationId))) {
      return NextResponse.json(
        { success: false, message: "Assignee must be a member of this organization" },
        { status: 400 }
      );
    }

    // updateMany only accepts scalar fields, so the assignee is set through
    // its foreign key rather than a relation connect.
    const result = await taskRepository(ctx).update(id, {
      ...rest,
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
    });

    if (result.count === 0) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
    }

    await writeAuditLog(ctx, {
      action: "UPDATED",
      entityType: "Task",
      entityId: id,
      metadata: rest,
    });

    // Notify only on an actual reassignment to someone new, and not when
    // people assign tasks to themselves.
    const wasReassigned = assigneeId !== undefined && assigneeId !== existingTask.assigneeId;
    if (wasReassigned && assigneeId && assigneeId !== ctx.userId) {
      await createNotification({
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        userId: assigneeId,
        type: "TASK_ASSIGNED",
        title: "Task assigned to you",
        body: `You were assigned "${existingTask.title}" in ${existingTask.project.name}`,
        entityId: id,
        entityType: "task",
      });

      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { email: true, name: true },
      });

      if (assignee) {
        await sendTaskAssignedEmail({
          tenantId: ctx.tenantId,
          to: assignee.email,
          assigneeName: assignee.name ?? "there",
          assignerName: session.user.name ?? "A teammate",
          taskTitle: existingTask.title,
          projectName: existingTask.project.name,
          taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${existingTask.project.id}`,
        });
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "task:delete");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const { id } = await params;
  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  const result = await taskRepository(ctx).delete(id);

  if (result.count === 0) {
    return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
  }

  await writeAuditLog(ctx, {
    action: "DELETED",
    entityType: "Task",
    entityId: id,
  });

  return NextResponse.json({ success: true, data: { id } });
}