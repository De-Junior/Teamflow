// PASTE LOCATION: src/app/api/files/[id]/route.ts (new file)

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fileRepository, writeAuditLog } from "@/lib/db/tenant";
import { createPresignedDownloadUrl, deleteObject, isPreviewable } from "@/lib/s3/s3";
import { Role } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const wantsDownload = searchParams.get("download") === "true";
  // redirect=true lets this route be used directly as an <img src> or <a
  // href> — those can't read a JSON body to grab the presigned URL first.
  const redirect = searchParams.get("redirect") === "true";

  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  try {
    const file = await fileRepository(ctx).findById(id);
    if (!file)
      return NextResponse.json({ success: false, message: "File not found" }, { status: 404 });

    const disposition = wantsDownload || !isPreviewable(file.mimeType) ? "attachment" : "inline";
    const url = await createPresignedDownloadUrl({
      key: file.key,
      fileName: file.name,
      disposition,
    });

    if (redirect) return NextResponse.redirect(url, { status: 307 });

    return NextResponse.json({
      success: true,
      data: { url, name: file.name, mimeType: file.mimeType, size: file.size },
    });
  } catch (error) {
    console.error("[FILE_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  try {
    const file = await fileRepository(ctx).findById(id);
    if (!file)
      return NextResponse.json({ success: false, message: "File not found" }, { status: 404 });

    // Deliberately not routed through requirePermission("file:delete"):
    // Owners/Managers can delete any file in the org, but everyone else
    // (Developer/Viewer) can only delete files they uploaded themselves.
    // That ownership check needs the file record, so it lives here instead
    // of in a blanket role permission.
    const canDeleteAny = session.user.role === Role.OWNER || session.user.role === Role.MANAGER;
    const isUploader = file.uploadedById === ctx.userId;
    if (!canDeleteAny && !isUploader)
      return NextResponse.json(
        { success: false, message: "You can only delete files you uploaded." },
        { status: 403 }
      );

    await deleteObject(file.key);
    await fileRepository(ctx).delete(id);

    await writeAuditLog(ctx, {
      action: "DELETED",
      entityType: "File",
      entityId: file.id,
      metadata: { name: file.name },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("[FILE_DELETE_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}