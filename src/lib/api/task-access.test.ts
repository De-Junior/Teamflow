import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";

const authMock = vi.fn();
const findFirstMock = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { task: { findFirst: (args: unknown) => findFirstMock(args) } } }));

const { requireTaskAccess, canModerate } = await import("./task-access");

const TASK_ID = "ckq8x2b1c0000qz8l3n4p5r6t";
const session = (role: string, tenantId = "ckq8x2b1c0001qz8l3n4p5r6t") => ({
  user: { id: "ckq8x2b1c0002qz8l3n4p5r6t", tenantId, organizationId: tenantId, role },
});

async function statusOf(promise: Promise<unknown>) {
  try {
    await promise;
    return 200;
  } catch (error) {
    if (error instanceof ApiError) return error.status;
    throw error;
  }
}

describe("requireTaskAccess", () => {
  beforeEach(() => {
    authMock.mockReset();
    findFirstMock.mockReset();
  });

  it("rejects anonymous requests with 401", async () => {
    authMock.mockResolvedValue(null);
    expect(await statusOf(requireTaskAccess(TASK_ID))).toBe(401);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("rejects roles without the required permission before touching the database", async () => {
    authMock.mockResolvedValue(session("VIEWER"));
    expect(await statusOf(requireTaskAccess(TASK_ID, "task:update"))).toBe(403);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("rejects malformed ids with 422 before touching the database", async () => {
    authMock.mockResolvedValue(session("OWNER"));
    expect(await statusOf(requireTaskAccess("not-an-id"))).toBe(422);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("scopes the task lookup to the caller's tenant", async () => {
    authMock.mockResolvedValue(session("DEVELOPER", "ckq8x2b1c0009qz8l3n4p5r6t"));
    findFirstMock.mockResolvedValue({ id: TASK_ID });

    const access = await requireTaskAccess(TASK_ID, "task:update");

    expect(access.taskId).toBe(TASK_ID);
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TASK_ID, tenantId: "ckq8x2b1c0009qz8l3n4p5r6t" } })
    );
  });

  it("answers 404 for a task that belongs to another tenant", async () => {
    authMock.mockResolvedValue(session("OWNER"));
    findFirstMock.mockResolvedValue(null); // the tenant filter matched nothing
    expect(await statusOf(requireTaskAccess(TASK_ID))).toBe(404);
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
