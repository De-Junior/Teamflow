import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonError, readJson, requireTaskAccess } from "@/lib/api/task-access";
import { createCommentSchema, firstIssue } from "@/validations/task-items";

type P = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: P) {
  const access = await requireTaskAccess((await params).id);
  if (!access.ok) return access.response;

  const comments = await prisma.comment.findMany({
    where: { taskId: access.taskId, tenantId: access.tenantId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json({ success: true, data: comments });
}

export async function POST(req: Request, { params }: P) {
  const access = await requireTaskAccess((await params).id, "comment:create");
  if (!access.ok) return access.response;

  const parsed = createCommentSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);

  const comment = await prisma.comment.create({
    data: {
      tenantId: access.tenantId,
      taskId: access.taskId,
      authorId: access.session.user.id,
      content: parsed.data.content,
    },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json({ success: true, data: comment }, { status: 201 });
}
