// PASTE LOCATION: src/app/api/invitations/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { inviteMemberSchema } from "@/validations/team";
import { Role, InvitationStatus } from "@prisma/client";

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

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;

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