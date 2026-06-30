// PASTE LOCATION: src/app/api/users/connected-accounts/[provider]/route.ts (create folder "[provider]" + file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

type P = { params: Promise<{ provider: string }> };

export async function DELETE(_req: Request, { params }: P) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const { provider } = await params;

  const [accountCount, user] = await Promise.all([
    prisma.account.count({ where: { userId: session.user.id } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } }),
  ]);

  // Prevent removing the only sign-in method
  if (accountCount <= 1 && !user?.password) {
    return NextResponse.json(
      { success: false, message: "You must set a password before disconnecting your only sign-in method." },
      { status: 400 }
    );
  }

  await prisma.account.deleteMany({ where: { userId: session.user.id, provider } });
  return NextResponse.json({ success: true });
}