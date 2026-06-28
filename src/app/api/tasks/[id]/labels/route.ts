// PASTE LOCATION: src/app/api/tasks/[id]/labels/route.ts (create folder + file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { id: taskId } = await params;
  const { name, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ success: false, message: "Name required." }, { status: 400 });

  const label = await prisma.taskLabel.create({
    data: { taskId, name: name.trim(), color: color ?? "#6366f1" },
  });
  return NextResponse.json({ success: true, data: label }, { status: 201 });
}