// PASTE LOCATION: src/app/api/tasks/route.ts (overwrite entire file)
import { NextResponse }                             from "next/server";
import { auth }                                     from "@/lib/auth";
import { taskRepository, projectRepository, writeAuditLog } from "@/lib/db/tenant";
import { requirePermission, UnauthorizedError }     from "@/lib/auth/permissions";
import { createTaskSchema }                         from "@/validations/project";
import { Role, Prisma }                             from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId  = searchParams.get("projectId")  ?? undefined;
  const status     = searchParams.get("status")     ?? undefined;
  const priority   = searchParams.get("priority")   ?? undefined;
  const assigneeId = searchParams.get("assigneeId") ?? undefined;
  const search     = searchParams.get("search")     ?? undefined;

  const ctx = {
    tenantId:       session.user.tenantId,
    organizationId: session.user.organizationId,
    userId:         session.user.id,
  };

  try {
    const where: Prisma.TaskWhereInput = {};
    if (projectId)  where.projectId  = projectId;
    if (status)     where.status     = status as never;
    if (priority)   where.priority   = priority as never;
    if (assigneeId) where.assigneeId = assigneeId;
    if (search)     where.title      = { contains: search, mode: "insensitive" };

    const tasks = await taskRepository(ctx).findMany({
      where,
      orderBy: { position: "asc" },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        labels:   true,
        _count:   { select: { comments: true, subtasks: true, checklistItems: true } },
      },
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error("[TASKS_GET_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  try {
    requirePermission(session.user.role as Role, "task:create");
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    throw error;
  }

  const ctx = {
    tenantId:       session.user.tenantId,
    organizationId: session.user.organizationId,
    userId:         session.user.id,
  };

  try {
    const body   = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );

    const { projectId, dueDate, assigneeId, ...rest } = parsed.data;

    const project = await projectRepository(ctx).findById(projectId);
    if (!project)
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });

    const lastTask = await taskRepository(ctx).findMany({
      where: { projectId, status: rest.status },
      orderBy: { position: "desc" },
      take: 1,
    });
    const position = (lastTask[0]?.position ?? -1) + 1;

    const task = await taskRepository(ctx).create({
      ...rest,
      position,
      dueDate: dueDate ? new Date(dueDate) : null,
      project: { connect: { id: projectId } },
      ...(assigneeId ? { assignee: { connect: { id: assigneeId } } } : {}),
    });

    await writeAuditLog(ctx, {
      action: "CREATED", entityType: "Task",
      entityId: task.id, metadata: { title: task.title, projectId },
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    console.error("[TASK_CREATE_ERROR]", error);
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}