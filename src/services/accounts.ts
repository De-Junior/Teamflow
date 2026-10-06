import bcrypt from "bcryptjs";
import { InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendVerificationEmail } from "@/lib/email/send";
import { logger } from "@/lib/logger";
import { badRequest, conflict, validationFailed } from "@/lib/api/errors";
import { createPersonalOrganization } from "@/lib/auth/ensure-organization";
import { issueToken } from "./auth-tokens";

/** Sign-up and organization provisioning, shared by email sign-up and Google sign-in. */

type RegisterInput = { name: string; email: string; password: string; inviteToken?: string };

/**
 * Creates an account. With an invitation token the user joins that
 * organization (and their email counts as verified, since the invite was sent
 * to it); otherwise they get their own organization and a verification email.
 */
export async function registerAccount({ name, email, password, inviteToken }: RegisterInput) {
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw conflict("An account with this email already exists. Try signing in instead.");
  }

  const invitation = inviteToken ? await prisma.invitation.findUnique({ where: { token: inviteToken } }) : null;
  if (inviteToken) {
    if (!invitation || invitation.status !== InvitationStatus.PENDING || invitation.expiresAt < new Date()) {
      throw badRequest("This invitation is invalid or has expired.");
    }
    if (invitation.email.toLowerCase() !== email) {
      throw validationFailed({ email: `This invitation was sent to ${invitation.email}. Register with that email.` });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, password: passwordHash, emailVerified: invitation ? new Date() : null },
    });

    if (!invitation) return { user, organization: await createPersonalOrganization(tx, user.id, name) };

    await tx.membership.create({
      data: { tenantId: invitation.organizationId, organizationId: invitation.organizationId, userId: user.id, role: invitation.role },
    });
    await tx.invitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.ACCEPTED } });
    const organization = await tx.organization.findUniqueOrThrow({ where: { id: invitation.organizationId } });
    return { user, organization };
  });

  if (!invitation) {
    const token = await issueToken("verify-email", email);
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
    await sendVerificationEmail({ to: email, name, verifyUrl });
    if (process.env.NODE_ENV === "development") logger.debug("auth.verify_link", { url: verifyUrl });
  }

  logger.info("account.registered", { userId: result.user.id, viaInvitation: Boolean(invitation) });
  return { userId: result.user.id, organizationSlug: result.organization.slug };
}
