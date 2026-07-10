// PASTE LOCATION: src/app/api/invitations/resend/route.ts (overwrite entire file)
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/lib/db/tenant";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { Role, InvitationStatus } from "@prisma/client";
import { sendInvitationReminderEmail } from "@/lib/email/send";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "members:invite");
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: e.message }, { status: 403 });
    }
    throw e;
  }

  try {
    const { invitationId } = await req.json();
    if (!invitationId) {
      return NextResponse.json({ success: false, message: "invitationId is required." }, { status: 400 });
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, tenantId: session.user.tenantId },
    });

    if (!invitation) {
      return NextResponse.json({ success: false, message: "Invitation not found." }, { status: 404 });
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return NextResponse.json({ success: false, message: "This invitation is no longer pending." }, { status: 400 });
    }

    // Extend expiry 7 days from now
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) },
    });

    const org = await prisma.organization.findUnique({
      where: { id: invitation.tenantId },
      select: { name: true },
    });

    // If the invited email already belongs to a registered user, send them
    // a fresh in-app notification too, in addition to the email below.
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    if (existingUser) {
      await createNotification({
        tenantId: invitation.tenantId,
        organizationId: invitation.organizationId,
        userId: existingUser.id,
        type: "USER_INVITED",
        title: "Invitation reminder",
        body: `Your invitation to join ${org?.name ?? "an organization"} as ${invitation.role} was resent`,
        entityId: invitation.id,
        entityType: "invitation",
      });
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;

    await sendInvitationReminderEmail({
      tenantId: invitation.tenantId,
      to: invitation.email,
      organizationName: org?.name ?? "an organization",
      role: invitation.role,
      inviteUrl,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[INVITATION_RESEND] ${inviteUrl}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[INVITATION_RESEND_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}