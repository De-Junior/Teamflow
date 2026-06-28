// PASTE LOCATION: src/app/api/tasks/[id]/time/[entryId]/route.ts (create folder + file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ entryId: string }> };

export async function DELETE(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { entryId } = await params;
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry) return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });

  const canDelete = ["SUPER_ADMIN", "OWNER", "MANAGER"].includes(session.user.role) || entry.userId === session.user.id;
  if (!canDelete) return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });

  await prisma.timeEntry.delete({ where: { id: entryId } });
  return NextResponse.json({ success: true });
}