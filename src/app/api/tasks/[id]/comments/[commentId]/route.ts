import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { canModerate, jsonError, requireTaskAccess } from "@/lib/api/task-access";

type P = { params: Promise<{ id: string; commentId: string }> };

export async function DELETE(_req: Request, { params }: P) {
  const { id, commentId } = await params;
  const access = await requireTaskAccess(id);
  if (!access.ok) return access.response;

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, taskId: access.taskId, tenantId: access.tenantId },
  });
  if (!comment) return jsonError("Comment not found.", 404);

  const { user } = access.session;
  if (!canModerate(user.role) && comment.authorId !== user.id) return jsonError("Forbidden.", 403);

  await prisma.comment.delete({ where: { id: comment.id } });
  return NextResponse.json({ success: true });
}
