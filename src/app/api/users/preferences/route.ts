import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";

const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  emailNotifications: z.boolean().optional(),
  taskAssignedNotif: z.boolean().optional(),
  defaultView: z.enum(["kanban", "list", "calendar"]).optional(),
});

export const GET = route("users.preferences", async () => {
  const actor = await requireActor();
  return ok(await prisma.userPreferences.upsert({ where: { userId: actor.userId }, update: {}, create: { userId: actor.userId } }));
});

export const PATCH = route("users.update_preferences", async (req) => {
  const actor = await requireActor();
  const input = await parseBody(req, preferencesSchema);
  const preferences = await prisma.userPreferences.upsert({
    where: { userId: actor.userId },
    update: input,
    create: { userId: actor.userId, ...input },
  });
  return ok(preferences);
});
