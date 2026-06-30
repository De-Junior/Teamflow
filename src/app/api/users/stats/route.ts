// PASTE LOCATION: src/app/api/users/stats/route.ts (create new file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const userId   = session.user.id;
  const tenantId = session.user.tenantId;

  const [tasksCompleted, projectsInvolved, commentsCount, filesUploaded] = await Promise.all([
    prisma.task.count({ where: { tenantId, assigneeId: userId, status: "DONE" } }),
    prisma.task.findMany({ where: { tenantId, assigneeId: userId }, select: { projectId: true }, distinct: ["projectId"] })
      .then(rows => rows.length),
    prisma.comment.count({ where: { tenantId, authorId: userId } }),
    prisma.file.count({ where: { tenantId, uploadedById: userId } }),
  ]);

  return NextResponse.json({
    success: true,
    data: { tasksCompleted, projectsInvolved, commentsCount, filesUploaded },
  });
}