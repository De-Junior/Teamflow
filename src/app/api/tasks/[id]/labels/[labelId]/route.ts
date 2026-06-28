// PASTE LOCATION: src/app/api/tasks/[id]/labels/[labelId]/route.ts (create folder + file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ labelId: string }> };

export async function DELETE(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { labelId } = await params;
  await prisma.taskLabel.delete({ where: { id: labelId } });
  return NextResponse.json({ success: true });
}