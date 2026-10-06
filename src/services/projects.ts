import { prisma } from "@/lib/db/prisma";
import { projectRepository, writeAuditLog } from "@/lib/db/tenant";
import { authorize, type Actor } from "@/lib/api/session";
import { notFound } from "@/lib/api/errors";
import type { CreateProjectInput, UpdateProjectInput } from "@/validations/project";

/** Project business rules, shared by the API routes and the server-rendered pages. */

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  doneCount: number;
  members: { id: string; name: string | null; image: string | null }[];
};

const MEMBER_PREVIEW_LIMIT = 4;

/**
 * Every project in the organization with task counts and a few members, in
 * three queries regardless of how many projects or tasks there are.
 */
export async function listProjectSummaries(actor: Actor): Promise<ProjectSummary[]> {
  const { tenantId } = actor.tenant;
  const [projects, counts, members] = await Promise.all([
    projectRepository(actor.tenant).findMany({ orderBy: { createdAt: "desc" } }),
    prisma.task.groupBy({ by: ["projectId", "status"], where: { tenantId }, _count: { _all: true } }),
    prisma.projectMember.findMany({
      where: { tenantId },
      orderBy: { addedAt: "asc" },
      select: { projectId: true, user: { select: { id: true, name: true, image: true } } },
    }),
  ]);

  const totals = new Map<string, { taskCount: number; doneCount: number }>();
  for (const row of counts) {
    const entry = totals.get(row.projectId) ?? { taskCount: 0, doneCount: 0 };
    entry.taskCount += row._count._all;
    if (row.status === "DONE") entry.doneCount += row._count._all;
    totals.set(row.projectId, entry);
  }

  const membersByProject = new Map<string, ProjectSummary["members"]>();
  for (const { projectId, user } of members) {
    const list = membersByProject.get(projectId) ?? [];
    if (list.length < MEMBER_PREVIEW_LIMIT) list.push(user);
    membersByProject.set(projectId, list);
  }

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    priority: p.priority,
    dueDate: p.dueDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    taskCount: totals.get(p.id)?.taskCount ?? 0,
    doneCount: totals.get(p.id)?.doneCount ?? 0,
    members: membersByProject.get(p.id) ?? [],
  }));
}

export async function getProject(actor: Actor, id: string) {
  const project = await projectRepository(actor.tenant).findById(id);
  if (!project) throw notFound("Project");
  return project;
}

const toDate = (value: string | null | undefined) => (value ? new Date(value) : null);

export async function createProject(actor: Actor, input: CreateProjectInput) {
  authorize(actor, "project:create");
  const { startDate, dueDate, ...rest } = input;

  const project = await projectRepository(actor.tenant).create({
    ...rest,
    startDate: toDate(startDate),
    dueDate: toDate(dueDate),
    // The creator joins the project so it appears in their workspace straight away.
    members: { create: { tenantId: actor.tenant.tenantId, user: { connect: { id: actor.userId } } } },
  });

  await writeAuditLog(actor.tenant, {
    action: "CREATED",
    entityType: "Project",
    entityId: project.id,
    metadata: { name: project.name },
  });
  return project;
}

export async function updateProject(actor: Actor, id: string, input: UpdateProjectInput) {
  authorize(actor, "project:update");
  const { startDate, dueDate, ...rest } = input;

  const result = await projectRepository(actor.tenant).update(id, {
    ...rest,
    ...(startDate !== undefined && { startDate: toDate(startDate) }),
    ...(dueDate !== undefined && { dueDate: toDate(dueDate) }),
  });
  if (result.count === 0) throw notFound("Project");

  await writeAuditLog(actor.tenant, { action: "UPDATED", entityType: "Project", entityId: id, metadata: input });
  return getProject(actor, id);
}

export async function deleteProject(actor: Actor, id: string) {
  authorize(actor, "project:delete");
  const result = await projectRepository(actor.tenant).delete(id);
  if (result.count === 0) throw notFound("Project");
  await writeAuditLog(actor.tenant, { action: "DELETED", entityType: "Project", entityId: id });
  return { id };
}

/** Copies a project's details (not its tasks) as a fresh, active project. */
export async function duplicateProject(actor: Actor, id: string) {
  authorize(actor, "project:create");
  const original = await getProject(actor, id);

  const copy = await projectRepository(actor.tenant).create({
    name: `${original.name} (copy)`,
    description: original.description,
    status: "ACTIVE",
    priority: original.priority,
    startDate: null,
    dueDate: null,
    members: { create: { tenantId: actor.tenant.tenantId, user: { connect: { id: actor.userId } } } },
  });

  await writeAuditLog(actor.tenant, {
    action: "CREATED",
    entityType: "Project",
    entityId: copy.id,
    metadata: { name: copy.name, duplicatedFrom: id },
  });
  return copy;
}
