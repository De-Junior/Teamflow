import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonError, readJson, requireTaskAccess } from "@/lib/api/task-access";
import { createTimeEntrySchema, firstIssue } from "@/validations/task-items";

type P = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: P) {
  const access = await requireTaskAccess((await params).id);
  if (!access.ok) return access.response;

  const entries = await prisma.timeEntry.findMany({
    where: { taskId: access.taskId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ success: true, data: entries });
}

export async function POST(req: Request, { params }: P) {
  const access = await requireTaskAccess((await params).id, "task:update");
  if (!access.ok) return access.response;

  const parsed = createTimeEntrySchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);

  const entry = await prisma.timeEntry.create({
    data: {
      taskId: access.taskId,
      userId: access.session.user.id,
      minutes: Math.round(parsed.data.minutes),
      note: parsed.data.note || null,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ success: true, data: entry }, { status: 201 });
}
