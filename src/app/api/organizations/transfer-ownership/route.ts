// PASTE LOCATION: src/app/api/organizations/transfer-ownership/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";
import { z } from "zod";

const transferSchema = z.object({
  newOwnerMembershipId: z.string().cuid(),
});

export async function POST(req: Request) {
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

  const tenantId = session.user.tenantId;

  try {
    const body = await req.json();
    const parsed = transferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { newOwnerMembershipId } = parsed.data;

    const currentMembership = await prisma.membership.findFirst({
      where: { tenantId, userId: session.user.id },
    });
    const newOwnerMembership = await prisma.membership.findFirst({
      where: { id: newOwnerMembershipId, tenantId },
    });

    if (!currentMembership) {
      return NextResponse.json(
        { success: false, message: "Could not find your membership." },
        { status: 404 }
      );
    }
    if (!newOwnerMembership) {
      return NextResponse.json(
        { success: false, message: "Could not find that member." },
        { status: 404 }
      );
    }
    if (newOwnerMembership.userId === session.user.id) {
      return NextResponse.json(
        { success: false, message: "You're already the owner." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.membership.update({
        where: { id: currentMembership.id },
        data: { role: Role.MANAGER },
      }),
      prisma.membership.update({
        where: { id: newOwnerMembership.id },
        data: { role: Role.OWNER },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TRANSFER_OWNERSHIP_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}