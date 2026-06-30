// PASTE LOCATION: src/app/api/users/activity/route.ts (create new file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const logs = await prisma.auditLog.findMany({
    where:   { tenantId: session.user.tenantId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take:    15,
  });
  return NextResponse.json({ success: true, data: logs });
}