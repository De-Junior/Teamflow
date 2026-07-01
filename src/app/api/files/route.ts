// PASTE LOCATION: src/app/api/files/route.ts (new file)

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  fileRepository,
  taskRepository,
  projectRepository,
  writeAuditLog,
} from "@/lib/db/tenant";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { confirmFileSchema } from "@/validations/file";
import {
  assertKeyBelongsToTenant,
  deleteObject,
  headObject,
  MAX_FILE_SIZE_BYTES,
  S3_BUCKET,
} from "@/lib/s3/s3";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const taskId = searchParams.get("taskId") ?? undefined;

  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  try {
    const files = await fileRepository(ctx).findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(taskId ? { taskId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { id: true, name: true, image: true } } },
    });
    return NextResponse.json({ success: true, data: files });
  } catch (error) {
    console.error("[FILES_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}

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
    const parsed = confirmFileSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );

    const { key, name, projectId, taskId } = parsed.data;

    try {
      assertKeyBelongsToTenant(key, ctx.tenantId);
    } catch {
      return NextResponse.json({ success: false, message: "Invalid file reference" }, { status: 403 });
    }

    // Never trust the client's claimed size/type — read the real object
    // back from S3 before writing anything to Postgres.
    const meta = await headObject(key);

    if (meta.size > MAX_FILE_SIZE_BYTES) {
      // A presigned PUT URL doesn't enforce size limits on its own, so this
      // is the actual enforcement point: reject + clean up the orphaned
      // object rather than ever persisting a row for it.
      await deleteObject(key);
      return NextResponse.json(
        { success: false, message: "File exceeds the 25MB upload limit." },
        { status: 400 }
      );
    }

    if (taskId) {
      const task = await taskRepository(ctx).findById(taskId);
      if (!task) {
        await deleteObject(key);
        return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
      }
    } else if (projectId) {
      const project = await projectRepository(ctx).findById(projectId);
      if (!project) {
        await deleteObject(key);
        return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
      }
    }

    const file = await fileRepository(ctx).create({
      name,
      key,
      // Reference only — never used directly for access since the bucket is
      // private. All reads go through the presigned GET in /api/files/[id].
      url: `https://${S3_BUCKET}.s3.amazonaws.com/${key}`,
      size: meta.size,
      mimeType: meta.contentType,
      ...(projectId ? { project: { connect: { id: projectId } } } : {}),
      ...(taskId ? { task: { connect: { id: taskId } } } : {}),
    });

    await writeAuditLog(ctx, {
      action: "CREATED",
      entityType: "File",
      entityId: file.id,
      metadata: { name: file.name, size: file.size, mimeType: file.mimeType },
    });

    return NextResponse.json({ success: true, data: file }, { status: 201 });
  } catch (error) {
    console.error("[FILE_CONFIRM_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}