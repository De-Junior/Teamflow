import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { taskRepository, projectRepository, writeAuditLog, createNotification } from "@/lib/db/tenant";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { createTaskSchema } from "@/validations/project";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "task:create");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  try {
    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { dueDate, assigneeId, projectId, ...rest } = parsed.data;

    // Verify the project belongs to this tenant before attaching a task to
    // it - without this check a caller could pass a projectId from another
    // organization and create a task outside their own tenant boundary.
    const project = await projectRepository(ctx).findById(projectId, {
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    const task = await taskRepository(ctx).create({
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
      project: { connect: { id: projectId } },
      ...(assigneeId && { assignee: { connect: { id: assigneeId } } }),
    });

    await writeAuditLog(ctx, {
      action: "CREATED",
      entityType: "Task",
      entityId: task.id,
      metadata: { title: task.title, projectId },
    });

    // Notify the assignee, unless they assigned the task to themselves.
    if (assigneeId && assigneeId !== ctx.userId) {
      await createNotification({
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        userId: assigneeId,
        type: "TASK_ASSIGNED",
        title: "Task assigned to you",
        body: `You were assigned "${task.title}" in ${project.name}`,
        entityId: task.id,
        entityType: "task",
      });
    }

    return NextResponse.json({ success: true, data: { id: task.id } });
  } catch (error) {
    console.error("[TASK_CREATE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
