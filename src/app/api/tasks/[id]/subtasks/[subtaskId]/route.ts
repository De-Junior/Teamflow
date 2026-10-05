// PASTE LOCATION: src/app/api/tasks/[id]/subtasks/[subtaskId]/route.ts (create folder + file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ subtaskId: string }> };

export async function PATCH(req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { subtaskId } = await params;
  const body = await req.json();

  const updated = await prisma.subTask.updateMany({
    where: { id: subtaskId },
    data:  { ...(body.completed !== undefined && { completed: body.completed }), ...(body.title && { title: body.title }) },
  });
  if (updated.count === 0) return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { subtaskId } = await params;
  await prisma.subTask.delete({ where: { id: subtaskId } });
  return NextResponse.json({ success: true });
}