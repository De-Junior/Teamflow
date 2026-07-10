import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { taskRepository, projectRepository, writeAuditLog, createNotification } from "@/lib/db/tenant";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { createTaskSchema } from "@/validations/project";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendTaskAssignedEmail } from "@/lib/email/send";

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
          taskTitle: task.title,
          projectName: project.name,
          taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}`,
        });
      }
    }

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}