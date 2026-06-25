// PASTE LOCATION: src/app/api/members/[id]/route.ts
// Create a folder literally named "[id]" with square brackets, inside src/app/api/members/
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { updateMemberRoleSchema } from "@/validations/team";
import { Role } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "members:role_change");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const { id } = await params;
  const tenantId = session.user.tenantId;

  try {
    const body = await req.json();
    const parsed = updateMemberRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const membership = await prisma.membership.findFirst({ where: { id, tenantId } });
    if (!membership) {
      return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
    }

    if (membership.role === Role.OWNER && parsed.data.role !== Role.OWNER) {
      const ownerCount = await prisma.membership.count({
        where: { tenantId, role: Role.OWNER },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { success: false, message: "An organization must have at least one owner." },
          { status: 400 }
        );
      }
    }

    await prisma.membership.update({
      where: { id },
      data: { role: parsed.data.role },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("[MEMBER_ROLE_UPDATE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "members:remove");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const { id } = await params;
  const tenantId = session.user.tenantId;

  const membership = await prisma.membership.findFirst({ where: { id, tenantId } });
  if (!membership) {
    return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
  }

  if (membership.userId === session.user.id) {
    return NextResponse.json(
      { success: false, message: "You can't remove yourself from the organization." },
      { status: 400 }
    );
  }

  if (membership.role === Role.OWNER) {
    const ownerCount = await prisma.membership.count({
      where: { tenantId, role: Role.OWNER },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { success: false, message: "An organization must have at least one owner." },
        { status: 400 }
      );
    }
  }

  await prisma.membership.delete({ where: { id } });

  return NextResponse.json({ success: true, data: { id } });
}