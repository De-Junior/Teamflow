// PASTE LOCATION: src/app/api/tasks/[id]/route.ts
// Create a folder literally named "[id]" with square brackets, inside src/app/api/tasks/
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { taskRepository, writeAuditLog } from "@/lib/db/tenant";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { updateTaskSchema } from "@/validations/project";
import { Role } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

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

    const result = await taskRepository(ctx).update(id, {
      ...rest,
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(assigneeId !== undefined && {
        assignee: assigneeId ? { connect: { id: assigneeId } } : { disconnect: true },
      }),
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

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("[TASK_UPDATE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
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