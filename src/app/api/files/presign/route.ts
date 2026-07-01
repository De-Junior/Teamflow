// PASTE LOCATION: src/app/api/files/presign/route.ts (new file)

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { projectRepository, taskRepository } from "@/lib/db/tenant";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { presignFileSchema } from "@/validations/file";
import { buildObjectKey, createPresignedUploadUrl } from "@/lib/s3/s3";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    requirePermission(session.user.role as Role, "file:upload");
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    throw error;
  }

  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  try {
    const body = await req.json();
    const parsed = presignFileSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );

    const { fileName, contentType, projectId, taskId } = parsed.data;

    // Confirm the target project/task actually belongs to this tenant
    // before handing out a key scoped to it — projectRepository/
    // taskRepository already filter by tenantId, so a cross-tenant id
    // simply resolves to null here.
    if (taskId) {
      const task = await taskRepository(ctx).findById(taskId);
      if (!task)
        return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
    } else if (projectId) {
      const project = await projectRepository(ctx).findById(projectId);
      if (!project)
        return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    const key = buildObjectKey({ tenantId: ctx.tenantId, projectId, taskId, fileName });
    const uploadUrl = await createPresignedUploadUrl({ key, contentType });

    return NextResponse.json({
      success: true,
      data: { uploadUrl, key, expiresIn: 300 },
    });
  } catch (error) {
    console.error("[FILE_PRESIGN_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}