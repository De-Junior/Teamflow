// PASTE LOCATION: src/app/api/tasks/[id]/comments/[commentId]/route.ts (create folder + file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ id: string; commentId: string }> };

export async function DELETE(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { commentId } = await params;

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.tenantId !== session.user.tenantId)
    return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });

  const canDelete = ["SUPER_ADMIN", "OWNER", "MANAGER"].includes(session.user.role) || comment.authorId === session.user.id;
  if (!canDelete) return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });

  await prisma.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}