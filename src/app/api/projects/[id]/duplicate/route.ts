// PASTE LOCATION: src/app/api/projects/[id]/duplicate/route.ts
// Create folder named "duplicate" inside src/app/api/projects/[id]/
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { projectRepository, writeAuditLog } from "@/lib/db/tenant";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "project:create");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const { id } = await params;
  const ctx = {
    tenantId:       session.user.tenantId,
    organizationId: session.user.organizationId,
    userId:         session.user.id,
  };

  try {
    const original = await projectRepository(ctx).findById(id);
    if (!original) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    const duplicate = await projectRepository(ctx).create({
      name:        `${original.name} (copy)`,
      description: original.description,
      status:      "ACTIVE",
      priority:    original.priority,
      startDate:   null,
      dueDate:     null,
    });

    await writeAuditLog(ctx, {
      action:     "CREATED",
      entityType: "Project",
      entityId:   duplicate.id,
      metadata:   { name: duplicate.name, duplicatedFrom: id },
    });

    return NextResponse.json({ success: true, data: duplicate }, { status: 201 });
  } catch (error) {
    console.error("[PROJECT_DUPLICATE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}