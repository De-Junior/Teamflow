import { beforeEach, describe, expect, it } from "vitest";
import { Role, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { reorderTasks, updateTask } from "@/services/tasks";
import { addMember, createOrganization, createProjectWithTask, resetDatabase } from "./fixtures";

beforeEach(resetDatabase);

describe("task completion time", () => {
  it("is set when a task moves to Done and cleared when it moves back", async () => {
    const { actor } = await createOrganization();
    const { task } = await createProjectWithTask(actor);

    await updateTask(actor, task.id, { status: TaskStatus.DONE });
    const done = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(done.completedAt).toBeInstanceOf(Date);

    // Editing a finished task doesn't move its completion time.
    await updateTask(actor, task.id, { title: "Renamed" });
    const renamed = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(renamed.completedAt?.getTime()).toBe(done.completedAt?.getTime());

    await updateTask(actor, task.id, { status: TaskStatus.IN_PROGRESS });
    const reopened = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(reopened.completedAt).toBeNull();
  });

  it("is also set by a Kanban drag into Done", async () => {
    const { actor } = await createOrganization();
    const { task } = await createProjectWithTask(actor);

    await reorderTasks(actor, { tasks: [{ id: task.id, status: TaskStatus.DONE, position: 0 }] });
    const moved = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(moved.completedAt).toBeInstanceOf(Date);
  });
});

describe("task permissions", () => {
  it("lets a developer update a task but not reassign it", async () => {
    const owner = await createOrganization();
    const dev = await addMember(owner.organization.id, Role.DEVELOPER);
    const { task } = await createProjectWithTask(owner.actor);

    await expect(updateTask(dev.actor, task.id, { status: TaskStatus.TODO })).resolves.toBeTruthy();
    await expect(updateTask(dev.actor, task.id, { assigneeId: dev.user.id })).rejects.toMatchObject({ status: 403 });
  });

  it("refuses to assign someone from another organization", async () => {
    const acme = await createOrganization("Acme");
    const outsider = await createOrganization("Globex");
    const { task } = await createProjectWithTask(acme.actor);

    await expect(updateTask(acme.actor, task.id, { assigneeId: outsider.owner.id })).rejects.toMatchObject({ status: 422 });
  });

  it("does not let a viewer change anything", async () => {
    const owner = await createOrganization();
    const viewer = await addMember(owner.organization.id, Role.VIEWER);
    const { task } = await createProjectWithTask(owner.actor);

    await expect(updateTask(viewer.actor, task.id, { title: "Nope" })).rejects.toMatchObject({ status: 403 });
  });
});
