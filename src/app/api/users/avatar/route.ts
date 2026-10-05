import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// Avatars are resized to 256×256 in the browser before upload, which keeps
// them around 10–30 KB. That's small enough to live on the user row as a data
// URL, so uploads work without provisioning object storage. The cap below is
// generous headroom, not the expected size.
const MAX_DATA_URL_LENGTH = 200_000;

const avatarSchema = z.object({
  image: z
    .string()
    .max(MAX_DATA_URL_LENGTH, "Image is too large. Please choose a smaller picture.")
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/, "Unsupported image format."),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const parsed = avatarSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Invalid image." },
      { status: 400 }
    );
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { image: parsed.data.image } });
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  await prisma.user.update({ where: { id: session.user.id }, data: { image: null } });
  return NextResponse.json({ success: true });
}
