import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { blockOnDemo } from "@/lib/api/demo-guard";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const demoBlock = blockOnDemo(session);
  if (demoBlock) return demoBlock;

  try {
    requirePermission(session.user.role as Role, "org:delete");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const organizationId = session.user.organizationId;

  try {
    // Every tenant-owned table references Organization with onDelete: Cascade,
    // so one delete removes the organization's projects, tasks, memberships,
    // invitations, audit trail and billing records together.
    await prisma.organization.delete({ where: { id: organizationId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ORG_DELETE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}