import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { ok, route } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireActor } from "@/lib/api/session";

// Avatars are resized to 256×256 in the browser before upload, which keeps
// them around 10–30 KB. That's small enough to live on the user row as a data
// URL, so uploads work without provisioning object storage. The cap below is
// generous headroom, not the expected size.
const MAX_DATA_URL_LENGTH = 200_000;

const avatarSchema = z.object({
  image: z
    .string()
    .max(MAX_DATA_URL_LENGTH, "Image is too large. Please choose a smaller picture.")
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/, "Unsupported image format."),
});

export const POST = route("users.avatar.set", async (req) => {
  const actor = await requireActor();
  const { image } = await parseBody(req, avatarSchema);
  await prisma.user.update({ where: { id: actor.userId }, data: { image } });
  return ok({ updated: true });
});

export const DELETE = route("users.avatar.remove", async () => {
  const actor = await requireActor();
  await prisma.user.update({ where: { id: actor.userId }, data: { image: null } });
  return ok({ removed: true });
});
