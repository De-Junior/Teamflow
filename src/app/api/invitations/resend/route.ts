// PASTE LOCATION: src/app/api/invitations/resend/route.ts (create new file)
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

    // Extend expiry 7 days from now
    await prisma.invitation.update({
      where: { id: invitationId },
      data:  { expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) },
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;
    if (process.env.NODE_ENV === "development") console.log(`[INVITATION_RESEND] ${inviteUrl}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[INVITATION_RESEND_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}