import { z } from "zod";
import { notificationRepository } from "@/lib/db/tenant";
import { ok, route } from "@/lib/api/handler";
import { idSchema, parseBody, parseQuery } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";

const listQuery = z.object({ unreadOnly: z.enum(["true", "false"]).optional() });
const markSchema = z.union([z.object({ markAll: z.literal(true) }), z.object({ id: idSchema })]);

export const GET = route("notifications.list", async (req) => {
  const actor = await requireActor();
  const { unreadOnly } = parseQuery(req, listQuery);
  const repo = notificationRepository(actor.tenant);
  const [notifications, unreadCount] = await Promise.all([
    repo.findMany({ unreadOnly: unreadOnly === "true", take: 30 }),
    repo.unreadCount(),
  ]);
  return ok({ notifications, unreadCount });
});

export const PATCH = route("notifications.mark_read", async (req) => {
  const actor = await requireActor();
  const input = await parseBody(req, markSchema);
  const repo = notificationRepository(actor.tenant);
  if ("markAll" in input) await repo.markAllRead();
  else await repo.markRead(input.id);
  return ok({ updated: true });
});
