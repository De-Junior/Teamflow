import { prisma } from "@/lib/db/prisma";
import { sendPasswordResetEmail } from "@/lib/email/send";
import { ok, route } from "@/lib/api/handler";
import { clientIp, enforce, limits } from "@/lib/api/rate-limit";
import { parseBody } from "@/lib/api/request";
import { logger } from "@/lib/logger";
import { issueToken } from "@/services/auth-tokens";
import { forgotPasswordSchema } from "@/validations/auth";

const GENERIC_REPLY = { message: "If an account exists for that email, a reset link has been sent." };

/** Always answers the same way, so the endpoint can't be used to discover which emails have accounts. */
export const POST = route("auth.forgot_password", async (req) => {
  await enforce(`reset-request:${clientIp(req)}`, limits.passwordResetRequest);
  const { email } = await parseBody(req, forgotPasswordSchema);
  await enforce(`reset-request:${email}`, limits.passwordResetPerEmail);

  const user = await prisma.user.findUnique({ where: { email }, select: { password: true } });
  if (!user?.password) return ok(GENERIC_REPLY);

  const token = await issueToken("reset-password", email);
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail({ to: email, resetUrl });
  if (process.env.NODE_ENV === "development") logger.debug("auth.reset_link", { url: resetUrl });

  return ok(GENERIC_REPLY);
});
