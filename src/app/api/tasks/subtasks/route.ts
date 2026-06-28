// PASTE LOCATION: src/app/api/tasks/[id]/subtasks/route.ts (create folder + file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { id: taskId } = await params;

  const subtasks = await prisma.subTask.findMany({
    where: { taskId }, orderBy: { position: "asc" },
  });
  return NextResponse.json({ success: true, data: subtasks });
}

export async function POST(req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { id: taskId } = await params;

  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ success: false, message: "Title is required." }, { status: 400 });

  const last = await prisma.subTask.findFirst({ where: { taskId }, orderBy: { position: "desc" } });
  const subtask = await prisma.subTask.create({
    data: { taskId, title: title.trim(), position: (last?.position ?? -1) + 1 },
  });
  return NextResponse.json({ success: true, data: subtask }, { status: 201 });
}