// PASTE LOCATION: src/app/api/tasks/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { taskRepository, projectRepository, writeAuditLog } from "@/lib/db/tenant";
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

    const { projectId, dueDate, assigneeId, ...rest } = parsed.data;

    const project = await projectRepository(ctx).findById(projectId);
    if (!project) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    const lastTask = await taskRepository(ctx).findMany({
      where: { projectId, status: rest.status },
      orderBy: { position: "desc" },
      take: 1,
    });
    const position = (lastTask[0]?.position ?? -1) + 1;

    const task = await taskRepository(ctx).create({
      ...rest,
      position,
      dueDate: dueDate ? new Date(dueDate) : null,
      project: { connect: { id: projectId } },
      ...(assigneeId ? { assignee: { connect: { id: assigneeId } } } : {}),
    });

    await writeAuditLog(ctx, {
      action: "CREATED",
      entityType: "Task",
      entityId: task.id,
      metadata: { title: task.title, projectId },
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    console.error("[TASK_CREATE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}