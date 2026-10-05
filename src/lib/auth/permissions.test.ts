import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { getRolePermissions, hasPermission, hasRole, requirePermission, UnauthorizedError } from "./permissions";

describe("permission matrix", () => {
  it("gives owners every organisation-level permission", () => {
    for (const p of ["org:manage", "org:billing", "org:delete", "members:role_change"] as const) {
      expect(hasPermission(Role.OWNER, p)).toBe(true);
    }
  });

  it("keeps billing and org deletion away from managers", () => {
    expect(hasPermission(Role.MANAGER, "org:billing")).toBe(false);
    expect(hasPermission(Role.MANAGER, "org:delete")).toBe(false);
    expect(hasPermission(Role.MANAGER, "task:assign")).toBe(true);
  });

  it("lets developers update tasks but not assign or delete them", () => {
    expect(hasPermission(Role.DEVELOPER, "task:update")).toBe(true);
    expect(hasPermission(Role.DEVELOPER, "task:assign")).toBe(false);
    expect(hasPermission(Role.DEVELOPER, "task:delete")).toBe(false);
  });

  it("makes viewers read-only", () => {
    expect(getRolePermissions(Role.VIEWER)).toEqual([]);
  });

  it("never grants a lower role something a higher role lacks", () => {
    const order = [Role.VIEWER, Role.DEVELOPER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN];
    for (let i = 1; i < order.length; i++) {
      const lower = new Set(getRolePermissions(order[i - 1]));
      const higher = new Set(getRolePermissions(order[i]));
      for (const p of lower) expect(higher.has(p), `${order[i]} should include ${p}`).toBe(true);
    }
  });
});

describe("role hierarchy", () => {
  it("compares roles by seniority", () => {
    expect(hasRole(Role.OWNER, Role.MANAGER)).toBe(true);
    expect(hasRole(Role.DEVELOPER, Role.MANAGER)).toBe(false);
    expect(hasRole(Role.MANAGER, Role.MANAGER)).toBe(true);
  });
});

describe("requirePermission", () => {
  it("throws an UnauthorizedError naming the missing permission", () => {
    expect(() => requirePermission(Role.VIEWER, "project:create")).toThrowError(UnauthorizedError);
    expect(() => requirePermission(Role.VIEWER, "project:create")).toThrowError(/project:create/);
  });

  it("passes silently when the role has the permission", () => {
    expect(() => requirePermission(Role.MANAGER, "project:create")).not.toThrow();
  });
});
