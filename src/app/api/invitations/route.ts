import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { blockOnDemo } from "@/lib/api/demo-guard";
import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/lib/db/tenant";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { inviteMemberSchema } from "@/validations/team";
import { Role, InvitationStatus } from "@prisma/client";
import { sendInvitationEmail } from "@/lib/email/send";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const invitations = await prisma.invitation.findMany({
    where: { tenantId: session.user.tenantId, status: InvitationStatus.PENDING },
    orderBy: { createdAt: "desc" },
    include: {
      invitedBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ success: true, data: invitations });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const demoBlock = blockOnDemo(session);
  if (demoBlock) return demoBlock;

  try {
    requirePermission(session.user.role as Role, "members:invite");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const tenantId = session.user.tenantId;

  try {
    const body = await req.json();
    const parsed = inviteMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    const existingMember = await prisma.membership.findFirst({
      where: { tenantId, user: { email } },
    });
    if (existingMember) {
      return NextResponse.json(
        { success: false, message: "This person is already a member of your organization." },
        { status: 409 }
      );
    }

    const existingInvite = await prisma.invitation.findFirst({
      where: { tenantId, email, status: InvitationStatus.PENDING },
    });
    if (existingInvite) {
      return NextResponse.json(
        { success: false, message: "An invitation is already pending for this email." },
        { status: 409 }
      );
    }

    const invitation = await prisma.invitation.create({
      data: {
        tenantId,
        organizationId: tenantId,
        email,
        role,
        invitedById: session.user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    // If the invited email already belongs to a registered user, notify
    // them in-app immediately in addition to the email below.
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      await createNotification({
        tenantId,
        organizationId: tenantId,
        userId: existingUser.id,
        type: "USER_INVITED",
        title: "You've been invited",
        body: `You were invited to join ${org?.name ?? "an organization"} as ${role}`,
        entityId: invitation.id,
        entityType: "invitation",
      });
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;

    // Fire-and-forget-style await: sendInvitationEmail never throws, so this
    // cannot fail the invitation creation itself. Failures land in EmailLog.
    await sendInvitationEmail({
      tenantId,
      to: email,
      organizationName: org?.name ?? "an organization",
      inviterName: session.user.name ?? "A teammate",
      role,
      inviteUrl,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[INVITATION_LINK] ${inviteUrl}`);
    }

    return NextResponse.json({ success: true, data: invitation }, { status: 201 });
  } catch (error) {
    console.error("[INVITATION_CREATE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}