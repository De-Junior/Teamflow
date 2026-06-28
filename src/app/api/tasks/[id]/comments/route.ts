// PASTE LOCATION: src/app/api/tasks/[id]/comments/route.ts (create folder + file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { id: taskId } = await params;

  const comments = await prisma.comment.findMany({
    where:   { taskId, tenantId: session.user.tenantId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json({ success: true, data: comments });
}

export async function POST(req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { id: taskId } = await params;

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ success: false, message: "Content is required." }, { status: 400 });

  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId: session.user.tenantId } });
  if (!task) return NextResponse.json({ success: false, message: "Task not found." }, { status: 404 });

  const comment = await prisma.comment.create({
    data: { tenantId: session.user.tenantId, taskId, authorId: session.user.id, content: content.trim() },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json({ success: true, data: comment }, { status: 201 });
}