import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonError, requireTaskAccess } from "@/lib/api/task-access";

type P = { params: Promise<{ id: string; labelId: string }> };

export async function DELETE(_req: Request, { params }: P) {
  const { id, labelId } = await params;
  const access = await requireTaskAccess(id, "task:update");
  if (!access.ok) return access.response;

  const deleted = await prisma.taskLabel.deleteMany({ where: { id: labelId, taskId: access.taskId } });
  if (deleted.count === 0) return jsonError("Label not found.", 404);
  return NextResponse.json({ success: true });
}
