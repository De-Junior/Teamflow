import { Role } from "@prisma/client";

// ─── Permission definitions ──────────────────────────────────────────────────

export type Permission =
  | "org:manage"
  | "org:billing"
  | "org:delete"
  | "members:invite"
  | "members:remove"
  | "members:role_change"
  | "project:create"
  | "project:update"
  | "project:delete"
  | "project:archive"
  | "project:manage_members"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "task:assign"
  | "comment:create"
  | "comment:delete"
  | "file:upload"
  | "file:delete"
  | "analytics:view"
  | "audit:view";

// ─── Role → Permission matrix ────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "org:manage", "org:billing", "org:delete",
    "members:invite", "members:remove", "members:role_change",
    "project:create", "project:update", "project:delete", "project:archive", "project:manage_members",
    "task:create", "task:update", "task:delete", "task:assign",
    "comment:create", "comment:delete",
    "file:upload", "file:delete",
    "analytics:view", "audit:view",
  ],

  OWNER: [
    "org:manage", "org:billing", "org:delete",
    "members:invite", "members:remove", "members:role_change",
    "project:create", "project:update", "project:delete", "project:archive", "project:manage_members",
    "task:create", "task:update", "task:delete", "task:assign",
    "comment:create", "comment:delete",
    "file:upload", "file:delete",
    "analytics:view", "audit:view",
  ],

  MANAGER: [
    "project:create", "project:update", "project:delete", "project:archive", "project:manage_members",
    "task:create", "task:update", "task:delete", "task:assign",
    "comment:create", "comment:delete",
    "file:upload", "file:delete",
    "analytics:view",
  ],

  DEVELOPER: [
    "task:update",
    "comment:create",
    "file:upload",
  ],

  VIEWER: [],
};

// ─── Role hierarchy (higher index = more access) ─────────────────────────────

const ROLE_HIERARCHY: Role[] = [
  Role.VIEWER,
  Role.DEVELOPER,
  Role.MANAGER,
  Role.OWNER,
  Role.SUPER_ADMIN,
];

// ─── Permission check helpers ─────────────────────────────────────────────────

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ─── Server-side permission guard ─────────────────────────────────────────────

export class UnauthorizedError extends Error {
  constructor(permission?: Permission) {
    super(
      permission
        ? `Insufficient permissions: requires "${permission}"`
        : "Unauthorized"
    );
    this.name = "UnauthorizedError";
  }
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new UnauthorizedError(permission);
  }
}
