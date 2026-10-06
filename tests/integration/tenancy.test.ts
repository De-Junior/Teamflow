import { beforeEach, describe, expect, it } from "vitest";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { deleteTask, getTask, reorderTasks, updateTask } from "@/services/tasks";
import { getProject } from "@/services/projects";
import { createOrganization, createProjectWithTask, resetDatabase } from "./fixtures";

beforeEach(resetDatabase);

describe("tenant isolation", () => {
  it("never returns or changes another organization's work", async () => {
    const acme = await createOrganization("Acme");
    const globex = await createOrganization("Globex");
    const { project, task } = await createProjectWithTask(globex.actor);

    await expect(getTask(acme.actor, task.id)).rejects.toMatchObject({ status: 404 });
    await expect(getProject(acme.actor, project.id)).rejects.toMatchObject({ status: 404 });
    await expect(updateTask(acme.actor, task.id, { title: "Hijacked" })).rejects.toMatchObject({ status: 404 });
    await expect(deleteTask(acme.actor, task.id)).rejects.toMatchObject({ status: 404 });

    const untouched = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(untouched.title).toBe("Write tests");
  });

  it("rejects a reorder that includes a foreign task, writing nothing", async () => {
    const acme = await createOrganization("Acme");
    const globex = await createOrganization("Globex");
    const own = await createProjectWithTask(acme.actor, "Ours");
    const foreign = await createProjectWithTask(globex.actor, "Theirs");

    await expect(
      reorderTasks(acme.actor, {
        tasks: [
          { id: own.task.id, status: TaskStatus.DONE, position: 0 },
          { id: foreign.task.id, status: TaskStatus.DONE, position: 1 },
        ],
      })
    ).rejects.toMatchObject({ status: 404 });

    const [ours, theirs] = await Promise.all([
      prisma.task.findUniqueOrThrow({ where: { id: own.task.id } }),
      prisma.task.findUniqueOrThrow({ where: { id: foreign.task.id } }),
    ]);
    expect(ours.status).toBe(TaskStatus.BACKLOG);
    expect(theirs.status).toBe(TaskStatus.BACKLOG);
  });
});
