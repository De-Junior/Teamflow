import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { blockOnDemo } from "@/lib/api/demo-guard";
import { prisma }       from "@/lib/db/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.sessionId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const demoBlock = blockOnDemo(session);
  if (demoBlock) return demoBlock;

  await prisma.activeSession.updateMany({
    where: { userId: session.user.id, sessionId: { not: session.user.sessionId }, revoked: false },
    data:  { revoked: true },
  });

  return NextResponse.json({ success: true });
}