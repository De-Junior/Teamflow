import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { projectMemberRepository, requireMembership, writeAuditLog } from "@/lib/db/tenant";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };
const bodySchema = z.object({ userId: z.string().min(1) });

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  const members = await projectMemberRepository(ctx).listByProject(id);
  return NextResponse.json({ success: true, data: members });
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "project:manage_members");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const { id } = await params;
  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  }

  try {
    await requireMembership(parsed.data.userId, ctx.organizationId);
  } catch {
    return NextResponse.json({ success: false, message: "User is not a member of this organization" }, { status: 400 });
  }

  const member = await projectMemberRepository(ctx).add(id, parsed.data.userId);

  await writeAuditLog(ctx, {
    action: "UPDATED",
    entityType: "Project",
    entityId: id,
    metadata: { assignedUserId: parsed.data.userId },
  });

  return NextResponse.json({ success: true, data: member });
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "project:manage_members");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const { id } = await params;
  const ctx = {
    tenantId: session.user.tenantId,
    organizationId: session.user.organizationId,
    userId: session.user.id,
  };

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
  }

  await projectMemberRepository(ctx).remove(id, parsed.data.userId);

  await writeAuditLog(ctx, {
    action: "UPDATED",
    entityType: "Project",
    entityId: id,
    metadata: { unassignedUserId: parsed.data.userId },
  });

  return NextResponse.json({ success: true, data: { id } });
}