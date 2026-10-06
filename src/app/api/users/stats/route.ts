import { prisma } from "@/lib/db/prisma";
import { ok, route } from "@/lib/api/handler";
import { requireActor } from "@/lib/api/session";

export const GET = route("users.stats", async () => {
  const actor = await requireActor();
  const { tenantId } = actor.tenant;
  const userId = actor.userId;

  const [tasksCompleted, projects, commentsCount, time] = await Promise.all([
    prisma.task.count({ where: { tenantId, assigneeId: userId, status: "DONE" } }),
    prisma.task.groupBy({ by: ["projectId"], where: { tenantId, assigneeId: userId } }),
    prisma.comment.count({ where: { tenantId, authorId: userId } }),
    prisma.timeEntry.aggregate({ where: { userId, task: { tenantId } }, _sum: { minutes: true } }),
  ]);
  const hoursLogged = Math.round(((time._sum.minutes ?? 0) / 60) * 10) / 10;
  return ok({ tasksCompleted, projectsInvolved: projects.length, commentsCount, hoursLogged });
});
