// PASTE LOCATION: src/app/api/users/tasks/route.ts (create new file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const userId   = session.user.id;
  const tenantId = session.user.tenantId;
  const now      = new Date();

  const tasks = await prisma.task.findMany({
    where: { tenantId, assigneeId: userId },
    orderBy: { dueDate: "asc" },
    include: { project: { select: { id: true, name: true } } },
  });

  const upcoming  = tasks.filter(t => t.status !== "DONE" && (!t.dueDate || t.dueDate >= now));
  const completed = tasks.filter(t => t.status === "DONE");
  const overdue   = tasks.filter(t => t.status !== "DONE" && t.dueDate && t.dueDate < now);

  return NextResponse.json({ success: true, data: { upcoming, completed, overdue } });
}