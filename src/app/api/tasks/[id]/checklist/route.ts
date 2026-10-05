import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonError, readJson, requireTaskAccess } from "@/lib/api/task-access";
import { createItemSchema, firstIssue } from "@/validations/task-items";

type P = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: P) {
  const access = await requireTaskAccess((await params).id);
  if (!access.ok) return access.response;

  const items = await prisma.checklistItem.findMany({
    where: { taskId: access.taskId },
    orderBy: { position: "asc" },
  });
  return NextResponse.json({ success: true, data: items });
}

export async function POST(req: Request, { params }: P) {
  const access = await requireTaskAccess((await params).id, "task:update");
  if (!access.ok) return access.response;

  const parsed = createItemSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);

  const last = await prisma.checklistItem.findFirst({
    where: { taskId: access.taskId },
    orderBy: { position: "desc" },
  });
  const item = await prisma.checklistItem.create({
    data: { taskId: access.taskId, title: parsed.data.title, position: (last?.position ?? -1) + 1 },
  });
  return NextResponse.json({ success: true, data: item }, { status: 201 });
}
