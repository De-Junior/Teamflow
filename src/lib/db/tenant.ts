/**
 * Tenant-aware database helpers.
 *
 * Every query that touches business data MUST go through these helpers or
 * manually include `tenantId` in its where clause. This is the core of
 * multi-tenant data isolation - Organisation A can never read Organisation B's
 * data because every query is automatically scoped.
 */

import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export type TenantContext = {
  tenantId: string;
  organizationId: string;
  userId: string;
};

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

export function projectMemberRepository(ctx: TenantContext) {
  return {
    listByProject: (projectId: string) =>
      prisma.projectMember.findMany({
        where: { projectId, tenantId: ctx.tenantId },
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
      }),

    add: (projectId: string, userId: string) =>
      prisma.projectMember.upsert({
        where: { projectId_userId: { projectId, userId } },
        create: { projectId, userId, tenantId: ctx.tenantId },
        update: {},
      }),

    remove: (projectId: string, userId: string) =>
      prisma.projectMember.deleteMany({
        where: { projectId, userId, tenantId: ctx.tenantId },
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

export function fileRepository(ctx: TenantContext) {
  return {
    findMany<T extends Omit<Prisma.FileFindManyArgs, "where">>(
      args?: T & { where?: Prisma.FileWhereInput }
    ): Promise<Prisma.FileGetPayload<T>[]> {
      return prisma.file.findMany({
        ...args,
        where: { ...args?.where, tenantId: ctx.tenantId },
      } as Prisma.FileFindManyArgs) as Promise<Prisma.FileGetPayload<T>[]>;
    },

    findById<T extends Omit<Prisma.FileFindFirstArgs, "where">>(
      id: string,
      args?: T
    ): Promise<Prisma.FileGetPayload<T> | null> {
      return prisma.file.findFirst({
        ...args,
        where: { id, tenantId: ctx.tenantId },
      } as Prisma.FileFindFirstArgs) as Promise<Prisma.FileGetPayload<T> | null>;
    },

    create: (
      data: Omit<Prisma.FileCreateInput, "tenantId" | "organization" | "uploadedBy">
    ) =>
      prisma.file.create({
        data: {
          ...data,
          tenantId: ctx.tenantId,
          organization: { connect: { id: ctx.organizationId } },
          uploadedBy: { connect: { id: ctx.userId } },
        },
      }),

    delete: (id: string) =>
      prisma.file.deleteMany({
        where: { id, tenantId: ctx.tenantId },
      }),
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

// ─── Notification helpers ─────────────────────────────────────────────────────

export function notificationRepository(ctx: TenantContext) {
  return {
    findMany: (args?: { unreadOnly?: boolean; take?: number }) =>
      prisma.notification.findMany({
        where: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          ...(args?.unreadOnly ? { read: false } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: args?.take ?? 30,
      }),

    unreadCount: () =>
      prisma.notification.count({
        where: { tenantId: ctx.tenantId, userId: ctx.userId, read: false },
      }),

    markRead: (id: string) =>
      prisma.notification.updateMany({
        where: { id, tenantId: ctx.tenantId, userId: ctx.userId },
        data: { read: true },
      }),

    markAllRead: () =>
      prisma.notification.updateMany({
        where: { tenantId: ctx.tenantId, userId: ctx.userId, read: false },
        data: { read: true },
      }),
  };
}

export async function createNotification(params: {
  tenantId: string;
  organizationId: string;
  userId: string;
  type: Prisma.NotificationCreateInput["type"];
  title: string;
  body: string;
  entityId?: string;
  entityType?: string;
}) {
  return prisma.notification.create({
    data: {
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      entityId: params.entityId,
      entityType: params.entityType,
    },
  });
}
