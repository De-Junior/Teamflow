import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { jsonError, readJson, requireTaskAccess } from "@/lib/api/task-access";
import { createLabelSchema, firstIssue } from "@/validations/task-items";

type P = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: P) {
  const access = await requireTaskAccess((await params).id, "task:update");
  if (!access.ok) return access.response;

  const parsed = createLabelSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400);

  const label = await prisma.taskLabel.create({
    data: { taskId: access.taskId, name: parsed.data.name, color: parsed.data.color ?? "#6366f1" },
  });
  return NextResponse.json({ success: true, data: label }, { status: 201 });
}
