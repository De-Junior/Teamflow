// PASTE LOCATION: src/app/api/projects/[id]/route.ts
// Create a folder literally named "[id]" with square brackets, inside src/app/api/projects/
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { projectRepository, writeAuditLog } from "@/lib/db/tenant";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { updateProjectSchema } from "@/validations/project";
import { Role } from "@prisma/client";

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

  const project = await projectRepository(ctx).findById(id, {
    include: {
      tasks: {
        orderBy: { position: "asc" },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: project });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "project:update");
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
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { startDate, dueDate, ...rest } = parsed.data;

    const result = await projectRepository(ctx).update(id, {
      ...rest,
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    });

    if (result.count === 0) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    await writeAuditLog(ctx, {
      action: "UPDATED",
      entityType: "Project",
      entityId: id,
      metadata: rest,
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("[PROJECT_UPDATE_ERROR]", error);
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
    requirePermission(session.user.role as Role, "project:delete");
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

  const result = await projectRepository(ctx).delete(id);

  if (result.count === 0) {
    return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
  }

  await writeAuditLog(ctx, {
    action: "DELETED",
    entityType: "Project",
    entityId: id,
  });

  return NextResponse.json({ success: true, data: { id } });
}