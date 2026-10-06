import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { badRequest, validationFailed } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/handler";
import { clientIp, enforce, limits } from "@/lib/api/rate-limit";
import { parseBody } from "@/lib/api/request";
import { findValidToken } from "@/services/auth-tokens";
import { resetPasswordSchema } from "@/validations/auth";

export const POST = route("auth.reset_password", async (req) => {
  await enforce(`token:${clientIp(req)}`, limits.tokenRedemption);
  const { token, password } = await parseBody(req, resetPasswordSchema);

  const valid = await findValidToken("reset-password", token);
  if (!valid) throw badRequest("This reset link is invalid or has expired. Request a new one.");

  const user = await prisma.user.findUnique({ where: { email: valid.email }, select: { id: true, password: true } });
  if (!user) throw badRequest("This reset link is invalid or has expired. Request a new one.");
  if (user.password && (await bcrypt.compare(password, user.password))) {
    throw validationFailed({ password: "Choose a password different from your current one." });
  }

  // Changing the password also signs out every other device.
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(password, 12) } }),
    prisma.verificationToken.delete({ where: { token: valid.storedToken } }),
    prisma.activeSession.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true } }),
  ]);
  return ok({ passwordReset: true });
});
