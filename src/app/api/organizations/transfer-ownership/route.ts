// PASTE LOCATION: src/app/api/organizations/transfer-ownership/route.ts (overwrite entire file)
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "org:manage");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const { membershipId } = await req.json();
  if (!membershipId) {
    return NextResponse.json({ success: false, message: "membershipId is required" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;

  try {
    const target = await prisma.membership.findFirst({
      where: { id: membershipId, tenantId },
    });
    if (!target) {
      return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
    }

    const currentMembership = await prisma.membership.findFirst({
      where: { tenantId, userId: session.user.id },
    });
    if (!currentMembership) {
      return NextResponse.json({ success: false, message: "Membership not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.membership.update({ where: { id: target.id }, data: { role: Role.OWNER } }),
      prisma.membership.update({ where: { id: currentMembership.id }, data: { role: Role.MANAGER } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ORG_TRANSFER_OWNERSHIP_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}