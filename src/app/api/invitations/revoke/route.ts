// PASTE LOCATION: src/app/api/invitations/revoke/route.ts (create new file)
import { NextResponse }                         from "next/server";
import { auth }                                 from "@/lib/auth";
import { prisma }                               from "@/lib/db/prisma";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { Role, InvitationStatus }               from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try { requirePermission(session.user.role as Role, "members:invite"); }
  catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ success: false, message: e.message }, { status: 403 });
    throw e;
  }

  try {
    const { invitationId } = await req.json();
    if (!invitationId) return NextResponse.json({ success: false, message: "invitationId is required." }, { status: 400 });

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, tenantId: session.user.tenantId },
    });

    if (!invitation) return NextResponse.json({ success: false, message: "Invitation not found." }, { status: 404 });
    if (invitation.status !== InvitationStatus.PENDING) return NextResponse.json({ success: false, message: "This invitation is no longer pending." }, { status: 400 });

    await prisma.invitation.update({
      where: { id: invitationId },
      data:  { status: InvitationStatus.REVOKED },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[INVITATION_REVOKE_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}