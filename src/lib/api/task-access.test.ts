import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findFirstMock = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { task: { findFirst: (args: unknown) => findFirstMock(args) } } }));

const { requireTaskAccess, canModerate } = await import("./task-access");

const session = (role: string, tenantId = "tenant-a") => ({
  user: { id: "user-1", tenantId, organizationId: tenantId, role },
});

describe("requireTaskAccess", () => {
  beforeEach(() => {
    authMock.mockReset();
    findFirstMock.mockReset();
  });

  it("rejects anonymous requests with 401", async () => {
    authMock.mockResolvedValue(null);
    const access = await requireTaskAccess("task-1");
    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(401);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("rejects roles without the required permission before touching the database", async () => {
    authMock.mockResolvedValue(session("VIEWER"));
    const access = await requireTaskAccess("task-1", "task:update");
    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(403);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("scopes the task lookup to the caller's tenant", async () => {
    authMock.mockResolvedValue(session("DEVELOPER", "tenant-a"));
    findFirstMock.mockResolvedValue({ id: "task-1" });

    const access = await requireTaskAccess("task-1", "task:update");

    expect(access.ok).toBe(true);
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "task-1", tenantId: "tenant-a" } })
    );
  });

  it("answers 404 for a task that belongs to another tenant", async () => {
    authMock.mockResolvedValue(session("OWNER", "tenant-a"));
    findFirstMock.mockResolvedValue(null); // the tenant filter matched nothing

    const access = await requireTaskAccess("someone-elses-task");
    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(404);
  });
});

describe("canModerate", () => {
  it("allows managers and above to moderate other people's content", () => {
    expect(canModerate("MANAGER")).toBe(true);
    expect(canModerate("OWNER")).toBe(true);
    expect(canModerate("DEVELOPER")).toBe(false);
    expect(canModerate("VIEWER")).toBe(false);
  });
});
