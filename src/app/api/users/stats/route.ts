import { prisma } from "@/lib/db/prisma";
import { ok, route } from "@/lib/api/handler";
import { requireActor } from "@/lib/api/session";

export const GET = route("users.stats", async () => {
  const actor = await requireActor();
  const { tenantId } = actor.tenant;
  const userId = actor.userId;

  const [tasksCompleted, projects, commentsCount, filesUploaded] = await Promise.all([
    prisma.task.count({ where: { tenantId, assigneeId: userId, status: "DONE" } }),
    prisma.task.groupBy({ by: ["projectId"], where: { tenantId, assigneeId: userId } }),
    prisma.comment.count({ where: { tenantId, authorId: userId } }),
    prisma.file.count({ where: { tenantId, uploadedById: userId } }),
  ]);
  return ok({ tasksCompleted, projectsInvolved: projects.length, commentsCount, filesUploaded });
});
