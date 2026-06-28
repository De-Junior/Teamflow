// PASTE LOCATION: src/app/api/tasks/[id]/activity/route.ts (create folder + file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { id: taskId } = await params;

  const logs = await prisma.auditLog.findMany({
    where:   { tenantId: session.user.tenantId, entityType: "Task", entityId: taskId },
    orderBy: { createdAt: "desc" },
    take:    50,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ success: true, data: logs });
}