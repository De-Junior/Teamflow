// PASTE LOCATION: src/app/api/tasks/[id]/checklist/[itemId]/route.ts (create folder + file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ itemId: string }> };

export async function PATCH(req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { itemId } = await params;
  const body = await req.json();
  await prisma.checklistItem.update({
    where: { id: itemId },
    data:  { ...(body.checked !== undefined && { checked: body.checked }), ...(body.title && { title: body.title }) },
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { itemId } = await params;
  await prisma.checklistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}