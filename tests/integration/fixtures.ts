import { Role } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import type { Actor } from "@/lib/api/session";

/** Empties every application table, keeping the schema and migrations table. */
export async function resetDatabase() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

let counter = 0;
const unique = (prefix: string) => `${prefix}-${++counter}-${Date.now()}`;

export async function createUser(name = "Test User") {
  return prisma.user.create({ data: { name, email: `${unique("user")}@example.test` } });
}

/** An organization with an owner, returned as the owner's actor. */
export async function createOrganization(name = "Acme") {
  const owner = await createUser(`${name} Owner`);
  const organization = await prisma.organization.create({ data: { name, slug: unique(name.toLowerCase()) } });
  await prisma.membership.create({
    data: { tenantId: organization.id, organizationId: organization.id, userId: owner.id, role: Role.OWNER },
  });
  return { organization, owner, actor: actorFor(owner, organization.id, Role.OWNER) };
}

export async function addMember(organizationId: string, role: Role = Role.DEVELOPER, name = "Member") {
  const user = await createUser(name);
  const membership = await prisma.membership.create({
    data: { tenantId: organizationId, organizationId, userId: user.id, role },
  });
  return { user, membership, actor: actorFor(user, organizationId, role) };
}

export function actorFor(user: { id: string; name: string | null; email: string }, organizationId: string, role: Role): Actor {
  const session = {
    user: { id: user.id, name: user.name, email: user.email, organizationId, tenantId: organizationId, role, organizationSlug: "" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as unknown as Session;
  return { session, userId: user.id, role, tenant: { tenantId: organizationId, organizationId, userId: user.id } };
}

export async function createProjectWithTask(actor: Actor, taskTitle = "Write tests") {
  const project = await prisma.project.create({
    data: { tenantId: actor.tenant.tenantId, organizationId: actor.tenant.organizationId, name: unique("Project") },
  });
  const task = await prisma.task.create({
    data: { tenantId: actor.tenant.tenantId, projectId: project.id, title: taskTitle, creatorId: actor.userId },
  });
  return { project, task };
}
