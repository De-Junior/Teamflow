import { InvitationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createNotification, writeAuditLog } from "@/lib/db/tenant";
import { sendInvitationEmail, sendInvitationReminderEmail } from "@/lib/email/send";
import { logger } from "@/lib/logger";
import { authorize, type Actor } from "@/lib/api/session";
import { ApiError, conflict, forbidden, notFound } from "@/lib/api/errors";
import type { InviteMemberInput } from "@/validations/team";

/** Invitation lifecycle: invite, resend, revoke, and accept or decline by token. */

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const inviteUrl = (token: string) => `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

/** Pending invitations for the organization. Tokens are never returned in lists. */
export function listPendingInvitations(actor: Actor) {
  return prisma.invitation.findMany({
    where: { tenantId: actor.tenant.tenantId, status: InvitationStatus.PENDING },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: { select: { name: true, email: true } },
    },
  });
}

async function organizationName(organizationId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
  return org?.name ?? "an organization";
}

/** If the invitee already has an account, they also get an in-app notification. */
async function notifyExistingUser(invitation: { id: string; email: string; tenantId: string; organizationId: string }, title: string, body: string) {
  const user = await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
  if (!user) return;
  await createNotification({
    tenantId: invitation.tenantId,
    organizationId: invitation.organizationId,
    userId: user.id,
    type: "USER_INVITED",
    title,
    body,
    entityId: invitation.id,
    entityType: "invitation",
  });
}

export async function inviteMember(actor: Actor, { email, role }: InviteMemberInput) {
  authorize(actor, "members:invite");
  const { tenantId, organizationId } = actor.tenant;

  const [existingMember, existingInvite] = await Promise.all([
    prisma.membership.findFirst({ where: { tenantId, user: { email } }, select: { id: true } }),
    prisma.invitation.findFirst({ where: { tenantId, email, status: InvitationStatus.PENDING }, select: { id: true } }),
  ]);
  if (existingMember) throw conflict("This person is already a member of your organization.");
  if (existingInvite) throw conflict("An invitation is already pending for this email.");

  const invitation = await prisma.invitation.create({
    data: { tenantId, organizationId, email, role, invitedById: actor.userId, expiresAt: new Date(Date.now() + INVITATION_TTL_MS) },
  });
  const orgName = await organizationName(organizationId);

  await notifyExistingUser(invitation, "You've been invited", `You were invited to join ${orgName} as ${role}`);
  await sendInvitationEmail({
    tenantId,
    to: email,
    organizationName: orgName,
    inviterName: actor.session.user.name ?? "A teammate",
    role,
    inviteUrl: inviteUrl(invitation.token),
  });
  await writeAuditLog(actor.tenant, { action: "INVITED", entityType: "Invitation", entityId: invitation.id, metadata: { email, role } });

  // Without an email provider the link is only visible in the dev console.
  if (process.env.NODE_ENV === "development") logger.debug("invitation.link", { url: inviteUrl(invitation.token) });

  return { id: invitation.id, email, role, expiresAt: invitation.expiresAt };
}

async function findPendingInvitation(actor: Actor, invitationId: string) {
  const invitation = await prisma.invitation.findFirst({ where: { id: invitationId, tenantId: actor.tenant.tenantId } });
  if (!invitation) throw notFound("Invitation");
  if (invitation.status !== InvitationStatus.PENDING) throw conflict("This invitation is no longer pending.");
  return invitation;
}

export async function resendInvitation(actor: Actor, invitationId: string) {
  authorize(actor, "members:invite");
  const invitation = await findPendingInvitation(actor, invitationId);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  await prisma.invitation.update({ where: { id: invitation.id }, data: { expiresAt } });

  const orgName = await organizationName(invitation.organizationId);
  await notifyExistingUser(invitation, "Invitation reminder", `Your invitation to join ${orgName} as ${invitation.role} was resent`);
  await sendInvitationReminderEmail({
    tenantId: invitation.tenantId,
    to: invitation.email,
    organizationName: orgName,
    role: invitation.role,
    inviteUrl: inviteUrl(invitation.token),
  });
  return { id: invitation.id, expiresAt };
}

export async function revokeInvitation(actor: Actor, invitationId: string) {
  authorize(actor, "members:invite");
  const invitation = await findPendingInvitation(actor, invitationId);
  await prisma.invitation.update({ where: { id: invitation.id }, data: { status: InvitationStatus.REVOKED } });
  await writeAuditLog(actor.tenant, { action: "UPDATED", entityType: "Invitation", entityId: invitation.id, metadata: { status: "REVOKED" } });
  return { id: invitation.id };
}

/** Looks up a pending, unexpired invitation by its token (public: used before sign-in). */
export async function getInvitationByToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });
  if (!invitation || invitation.status !== InvitationStatus.PENDING) {
    throw new ApiError(404, "not_found", "This invitation is invalid or has already been used.");
  }
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { token }, data: { status: InvitationStatus.EXPIRED } });
    throw new ApiError(410, "gone", "This invitation has expired.");
  }
  return invitation;
}

function assertAddressedTo(invitation: { email: string }, email: string | null | undefined) {
  if (invitation.email.toLowerCase() !== email?.toLowerCase()) {
    throw forbidden(`This invitation was sent to ${invitation.email}. Sign in with that email to respond to it.`);
  }
}

export async function acceptInvitation(user: { id: string; email?: string | null }, token: string) {
  const invitation = await getInvitationByToken(token);
  assertAddressedTo(invitation, user.email);

  const existing = await prisma.membership.findFirst({
    where: { userId: user.id, organizationId: invitation.organizationId },
    select: { id: true },
  });
  if (existing) throw conflict("You're already a member of this organization.");

  await prisma.$transaction([
    prisma.membership.create({
      data: { tenantId: invitation.organizationId, userId: user.id, organizationId: invitation.organizationId, role: invitation.role },
    }),
    prisma.invitation.update({ where: { token }, data: { status: InvitationStatus.ACCEPTED } }),
  ]);

  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: invitation.organizationId }, select: { slug: true } });
  return { organizationId: invitation.organizationId, role: invitation.role, organizationSlug: organization.slug };
}

export async function declineInvitation(user: { email?: string | null }, token: string) {
  const invitation = await getInvitationByToken(token);
  assertAddressedTo(invitation, user.email);
  await prisma.invitation.update({ where: { token }, data: { status: InvitationStatus.REVOKED } });
  return { declined: true };
}
