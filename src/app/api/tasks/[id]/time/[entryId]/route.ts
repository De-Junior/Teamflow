import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { canModerate, jsonError, requireTaskAccess } from "@/lib/api/task-access";

type P = { params: Promise<{ id: string; entryId: string }> };

export async function DELETE(_req: Request, { params }: P) {
  const { id, entryId } = await params;
  const access = await requireTaskAccess(id);
  if (!access.ok) return access.response;

  const entry = await prisma.timeEntry.findFirst({ where: { id: entryId, taskId: access.taskId } });
  if (!entry) return jsonError("Time entry not found.", 404);

  const { user } = access.session;
  if (!canModerate(user.role) && entry.userId !== user.id) return jsonError("Forbidden.", 403);

  await prisma.timeEntry.delete({ where: { id: entry.id } });
  return NextResponse.json({ success: true });
}
