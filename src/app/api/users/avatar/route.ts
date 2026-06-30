// PASTE LOCATION: src/app/api/users/avatar/route.ts (create new file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";

const S3_CONFIGURED = !!(
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET
);

export async function POST(_req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  if (!S3_CONFIGURED) {
    return NextResponse.json(
      { success: false, message: "File storage isn't configured yet. Avatar uploads will work once S3 is set up." },
      { status: 503 }
    );
  }

  // Real upload logic goes here once AWS_* env vars are filled in.
  return NextResponse.json({ success: false, message: "Not implemented." }, { status: 501 });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  await prisma.user.update({ where: { id: session.user.id }, data: { image: null } });
  return NextResponse.json({ success: true });
}