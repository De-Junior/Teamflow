// PASTE LOCATION: src/app/api/tasks/[id]/time/route.ts (create folder + file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { id: taskId } = await params;
  const entries = await prisma.timeEntry.findMany({
    where:   { taskId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ success: true, data: entries });
}

export async function POST(req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { id: taskId } = await params;
  const { minutes, note } = await req.json();
  if (!minutes || minutes < 1) return NextResponse.json({ success: false, message: "Minutes must be at least 1." }, { status: 400 });

  const entry = await prisma.timeEntry.create({
    data: { taskId, userId: session.user.id, minutes: Math.round(minutes), note: note?.trim() || null },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ success: true, data: entry }, { status: 201 });
}