// PASTE LOCATION: src/app/api/organizations/delete/route.ts (new file)
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

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
    // NOTE: confirm your schema cascades (Project -> Task, Membership, Subscription, etc.)
    // delete on Organization, or this needs explicit cleanup first in a transaction.
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