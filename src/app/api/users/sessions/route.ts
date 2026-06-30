// PASTE LOCATION: src/app/api/users/sessions/route.ts (create new file + folder)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.activeSession.findMany({
    where:   { userId: session.user.id, revoked: false },
    orderBy: { lastSeenAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: sessions.map(s => ({ ...s, isCurrent: s.sessionId === session.user.sessionId })),
  });
}