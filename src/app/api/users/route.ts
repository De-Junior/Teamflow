import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { forbidOnDemo } from "@/lib/api/demo-guard";
import { badRequest, validationFailed } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { enforce, limits } from "@/lib/api/rate-limit";
import { parseBody } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";
import { passwordSchema } from "@/validations/auth";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  timezone: z.string().max(60).optional().nullable(),
  language: z.string().max(10).optional(),
  bio: z.string().max(500).optional().nullable(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: passwordSchema,
});

const updateSchema = z.union([passwordChangeSchema, profileSchema]);

export const GET = route("users.me", async () => {
  const actor = await requireActor();
  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { name: true, email: true, phone: true, timezone: true, language: true, bio: true, image: true, createdAt: true },
  });
  return ok(user);
});

export const PATCH = route("users.update", async (req) => {
  const actor = await requireActor();
  const input = await parseBody(req, updateSchema);

  if ("newPassword" in input) {
    forbidOnDemo(actor);
    await enforce(`password-change:${actor.userId}`, limits.signIn);

    const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { password: true } });
    if (!user?.password) throw badRequest("This account signs in with Google and has no password to change.");
    if (!(await bcrypt.compare(input.currentPassword, user.password))) {
      throw validationFailed({ currentPassword: "Current password is incorrect." });
    }
    if (await bcrypt.compare(input.newPassword, user.password)) {
      throw validationFailed({ newPassword: "Choose a password you haven't used here before." });
    }
    await prisma.user.update({ where: { id: actor.userId }, data: { password: await bcrypt.hash(input.newPassword, 12) } });
    return ok({ passwordChanged: true });
  }

  if (Object.keys(input).length === 0) throw badRequest("Nothing to update.");
  await prisma.user.update({ where: { id: actor.userId }, data: input });
  return ok(input);
});
