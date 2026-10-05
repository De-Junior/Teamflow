import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonError, readJson, requireTaskAccess } from "@/lib/api/task-access";
import { firstIssue, updateChecklistItemSchema } from "@/validations/task-items";

type P = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: Request, { params }: P) {
  const { id, itemId } = await params;
  const access = await requireTaskAccess(id, "task:update");
  if (!access.ok) return access.response;

  const parsed = updateChecklistItemSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);

  const updated = await prisma.checklistItem.updateMany({
    where: { id: itemId, taskId: access.taskId },
    data: parsed.data,
  });
  if (updated.count === 0) return jsonError("Checklist item not found.", 404);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: P) {
  const { id, itemId } = await params;
  const access = await requireTaskAccess(id, "task:update");
  if (!access.ok) return access.response;

  const deleted = await prisma.checklistItem.deleteMany({ where: { id: itemId, taskId: access.taskId } });
  if (deleted.count === 0) return jsonError("Checklist item not found.", 404);
  return NextResponse.json({ success: true });
}
