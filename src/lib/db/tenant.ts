/**
 * Tenant-aware database helpers.
 *
 * Every query that touches business data MUST go through these helpers or
 * manually include `tenantId` in its where clause. This is the core of
 * multi-tenant data isolation — Organisation A can never read Organisation B's
 * data because every query is automatically scoped.
 */

import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export type TenantContext = {
  tenantId: string;
  organizationId: string;
  userId: string;
};

// PASTE LOCATION: src/lib/db/tenant.ts
// Replace ONLY the projectRepository and taskRepository functions with the versions below.
// Everything else in the file (writeAuditLog, TenantContext, imports) stays the same.

export function projectRepository(ctx: TenantContext) {
  return {
    findMany<T extends Omit<Prisma.ProjectFindManyArgs, "where">>(
      args?: T & { where?: Prisma.ProjectWhereInput }
    ): Promise<Prisma.ProjectGetPayload<T>[]> {
      return prisma.project.findMany({
        ...args,
        where: { ...args?.where, tenantId: ctx.tenantId },
      } as Prisma.ProjectFindManyArgs) as Promise<Prisma.ProjectGetPayload<T>[]>;
    },

    findById<T extends Omit<Prisma.ProjectFindFirstArgs, "where">>(
      id: string,
      args?: T
    ): Promise<Prisma.ProjectGetPayload<T> | null> {
      return prisma.project.findFirst({
        ...args,
        where: { id, tenantId: ctx.tenantId },
      } as Prisma.ProjectFindFirstArgs) as Promise<Prisma.ProjectGetPayload<T> | null>;
    },

    create: (data: Omit<Prisma.ProjectCreateInput, "tenantId" | "organization">) =>
      prisma.project.create({
        data: {
          ...data,
          tenantId: ctx.tenantId,
          organization: { connect: { id: ctx.organizationId } },
        },
      }),

    update: (id: string, data: Prisma.ProjectUpdateInput) =>
      prisma.project.updateMany({
        where: { id, tenantId: ctx.tenantId },
        data,
      }),

    delete: (id: string) =>
      prisma.project.deleteMany({
        where: { id, tenantId: ctx.tenantId },
      }),
  };
}

export function taskRepository(ctx: TenantContext) {
  return {
    findMany<T extends Omit<Prisma.TaskFindManyArgs, "where">>(
      args?: T & { where?: Prisma.TaskWhereInput }
    ): Promise<Prisma.TaskGetPayload<T>[]> {
      return prisma.task.findMany({
        ...args,
        where: { ...args?.where, tenantId: ctx.tenantId },
      } as Prisma.TaskFindManyArgs) as Promise<Prisma.TaskGetPayload<T>[]>;
    },

    findById<T extends Omit<Prisma.TaskFindFirstArgs, "where">>(
      id: string,
      args?: T
    ): Promise<Prisma.TaskGetPayload<T> | null> {
      return prisma.task.findFirst({
        ...args,
        where: { id, tenantId: ctx.tenantId },
      } as Prisma.TaskFindFirstArgs) as Promise<Prisma.TaskGetPayload<T> | null>;
    },

    create: (data: Omit<Prisma.TaskCreateInput, "tenantId" | "creator">) =>
      prisma.task.create({
        data: {
          ...data,
          tenantId: ctx.tenantId,
          creator: { connect: { id: ctx.userId } },
        },
      }),

    update: (id: string, data: Prisma.TaskUpdateInput) =>
      prisma.task.updateMany({
        where: { id, tenantId: ctx.tenantId },
        data,
      }),

    delete: (id: string) =>
      prisma.task.deleteMany({
        where: { id, tenantId: ctx.tenantId },
      }),

    reorderKanban: async (taskIds: string[], status: string) => {
      await prisma.$transaction(
        taskIds.map((id, position) =>
          prisma.task.updateMany({
            where: { id, tenantId: ctx.tenantId },
            data: { position, status: status as never },
          })
        )
      );
    },
  };
}

// ─── Membership helpers ───────────────────────────────────────────────────────

export async function getUserMembership(userId: string, organizationId: string) {
  return prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    include: { organization: true },
  });
}

export async function requireMembership(userId: string, organizationId: string) {
  const membership = await getUserMembership(userId, organizationId);
  if (!membership) throw new Error("UNAUTHORIZED: not a member of this organization");
  return membership;
}

// ─── Audit log helper ─────────────────────────────────────────────────────────

// PASTE LOCATION: src/lib/db/tenant.ts
// Replace ONLY the writeAuditLog function (near the bottom of the file) with this version.
// Everything else in the file stays the same.

export async function writeAuditLog(
  ctx: TenantContext,
  entry: {
    action: Prisma.AuditLogCreateInput["action"];
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  const metadataValue: Prisma.InputJsonValue | typeof Prisma.JsonNull = entry.metadata
    ? (entry.metadata as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  return prisma.auditLog.create({
    data: {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: metadataValue,
    },
  });
}