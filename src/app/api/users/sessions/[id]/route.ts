import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { blockOnDemo } from "@/lib/api/demo-guard";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const demoBlock = blockOnDemo(session);
  if (demoBlock) return demoBlock;
  const { id } = await params;

  const target = await prisma.activeSession.findUnique({ where: { id } });
  if (!target || target.userId !== session.user.id) {
    return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
  }
  if (target.sessionId === session.user.sessionId) {
    return NextResponse.json({ success: false, message: "Use sign out to end your current session." }, { status: 400 });
  }

  await prisma.activeSession.update({ where: { id }, data: { revoked: true } });
  return NextResponse.json({ success: true });
}