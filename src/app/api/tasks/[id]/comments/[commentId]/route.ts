import { prisma } from "@/lib/db/prisma";
import { forbidden, notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { canModerate, requireTaskAccess } from "@/lib/api/task-access";

type Params = { id: string; commentId: string };

export const DELETE = route<Params>("comments.delete", async (_req, { params }) => {
  const { actor, taskId } = await requireTaskAccess(params.id);

  const comment = await prisma.comment.findFirst({
    where: { id: params.commentId, taskId, tenantId: actor.tenant.tenantId },
    select: { id: true, authorId: true },
  });
  if (!comment) throw notFound("Comment");
  if (!canModerate(actor.role) && comment.authorId !== actor.userId) throw forbidden("You can only delete your own comments.");

  await prisma.comment.delete({ where: { id: comment.id } });
  return ok({ id: comment.id });
});
