import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { badRequest } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { clientIp, enforce, limits } from "@/lib/api/rate-limit";
import { parseBody } from "@/lib/api/request";
import { findValidToken } from "@/services/auth-tokens";

const verifySchema = z.object({ token: z.string().min(1, "Invalid verification link.").max(200) });

export const POST = route("auth.verify_email", async (req) => {
  await enforce(`token:${clientIp(req)}`, limits.tokenRedemption);
  const { token } = await parseBody(req, verifySchema);

  const valid = await findValidToken("verify-email", token);
  if (!valid) throw badRequest("This verification link is invalid or has expired.");

  await prisma.$transaction([
    prisma.user.update({ where: { email: valid.email }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.delete({ where: { token: valid.storedToken } }),
  ]);
  return ok({ verified: true });
});
