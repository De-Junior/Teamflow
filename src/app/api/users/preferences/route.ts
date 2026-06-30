// PASTE LOCATION: src/app/api/users/preferences/route.ts (create new file)
import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";
import { z }            from "zod";

const schema = z.object({
  theme:              z.enum(["light", "dark", "system"]).optional(),
  emailNotifications: z.boolean().optional(),
  taskAssignedNotif:  z.boolean().optional(),
  taskUpdatedNotif:   z.boolean().optional(),
  defaultView:        z.enum(["kanban", "list", "calendar"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.userPreferences.upsert({
    where:  { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });
  return NextResponse.json({ success: true, data: prefs });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });

    const prefs = await prisma.userPreferences.upsert({
      where:  { userId: session.user.id },
      update: parsed.data,
      create: { userId: session.user.id, ...parsed.data },
    });
    return NextResponse.json({ success: true, data: prefs });
  } catch (error) {
    console.error("[PREFERENCES_UPDATE_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}