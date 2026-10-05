import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { blockOnDemo } from "@/lib/api/demo-guard";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const demoBlock = blockOnDemo(session);
  if (demoBlock) return demoBlock;

  try {
    requirePermission(session.user.role as Role, "org:manage");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  try {
    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: { archivedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ORG_ARCHIVE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}