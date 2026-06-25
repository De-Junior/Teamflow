// PASTE LOCATION: src/app/api/tasks/reorder/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { requirePermission, UnauthorizedError } from "@/lib/auth/permissions";
import { reorderTasksSchema } from "@/validations/project";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    requirePermission(session.user.role as Role, "task:update");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    throw error;
  }

  const tenantId = session.user.tenantId;

  try {
    const body = await req.json();
    const parsed = reorderTasksSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      parsed.data.tasks.map(({ id, status, position }) =>
        prisma.task.updateMany({
          where: { id, tenantId },
          data: { status, position },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TASK_REORDER_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}