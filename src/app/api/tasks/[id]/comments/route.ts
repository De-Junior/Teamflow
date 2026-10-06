import { prisma } from "@/lib/db/prisma";
import { created, ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireTaskAccess } from "@/lib/api/task-access";
import { createCommentSchema } from "@/validations/task-items";

type Params = { id: string };
const withAuthor = { author: { select: { id: true, name: true, image: true } } } as const;

export const GET = route<Params>("comments.list", async (_req, { params }) => {
  const { actor, taskId } = await requireTaskAccess(params.id);
  const comments = await prisma.comment.findMany({
    where: { taskId, tenantId: actor.tenant.tenantId },
    orderBy: { createdAt: "asc" },
    include: withAuthor,
  });
  return ok(comments);
});

export const POST = route<Params>("comments.create", async (req, { params }) => {
  const { actor, taskId } = await requireTaskAccess(params.id, "comment:create");
  const { content } = await parseBody(req, createCommentSchema);

  const comment = await prisma.comment.create({
    data: { tenantId: actor.tenant.tenantId, taskId, authorId: actor.userId, content },
    include: withAuthor,
  });
  return created(comment);
});
