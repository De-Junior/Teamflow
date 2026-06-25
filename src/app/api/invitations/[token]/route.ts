// PASTE LOCATION: src/app/api/invitations/[token]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { InvitationStatus } from "@prisma/client";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });

  if (!invitation || invitation.status !== InvitationStatus.PENDING) {
    return NextResponse.json(
      { success: false, message: "This invitation is invalid or has already been used." },
      { status: 404 }
    );
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json(
      { success: false, message: "This invitation has expired." },
      { status: 410 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.organization.name,
    },
  });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation || invitation.status !== InvitationStatus.PENDING) {
    return NextResponse.json(
      { success: false, message: "This invitation is invalid or has already been used." },
      { status: 404 }
    );
  }

  if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json(
      { success: false, message: "This invitation isn't addressed to you." },
      { status: 403 }
    );
  }

  await prisma.invitation.update({
    where: { token },
    data: { status: InvitationStatus.REVOKED },
  });

  return NextResponse.json({ success: true });
}

export async function POST(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, message: "Please sign in to accept this invitation." },
      { status: 401 }
    );
  }

  const { token } = await params;

  try {
    const invitation = await prisma.invitation.findUnique({ where: { token } });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      return NextResponse.json(
        { success: false, message: "This invitation is invalid or has already been used." },
        { status: 404 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { token },
        data: { status: InvitationStatus.EXPIRED },
      });
      return NextResponse.json(
        { success: false, message: "This invitation has expired." },
        { status: 410 }
      );
    }

    if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          message: `This invitation was sent to ${invitation.email}. Please sign in with that email to accept it.`,
        },
        { status: 403 }
      );
    }

    const existingMembership = await prisma.membership.findFirst({
      where: { userId: session.user.id, organizationId: invitation.organizationId },
    });
    if (existingMembership) {
      return NextResponse.json(
        { success: false, message: "You're already a member of this organization." },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.membership.create({
        data: {
          tenantId: invitation.organizationId,
          userId: session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      }),
      prisma.invitation.update({
        where: { token },
        data: { status: InvitationStatus.ACCEPTED },
      }),
    ]);

    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: invitation.organizationId },
      select: { slug: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        organizationId: invitation.organizationId,
        role: invitation.role,
        organizationSlug: organization.slug,
      },
    });
  } catch (error) {
    console.error("[INVITATION_ACCEPT_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}