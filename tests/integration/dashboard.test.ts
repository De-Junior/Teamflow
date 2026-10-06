import { beforeEach, describe, expect, it } from "vitest";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/db/tenant";
import { getDashboard } from "@/services/dashboard";
import { updateTask } from "@/services/tasks";
import { createOrganization, createProjectWithTask, resetDatabase } from "./fixtures";

beforeEach(resetDatabase);

const DAY = 24 * 60 * 60 * 1000;

describe("dashboard", () => {
  it("counts open, overdue and recently completed work for this organization only", async () => {
    const { actor } = await createOrganization("Acme");
    const other = await createOrganization("Globex");
    const { project, task: overdue } = await createProjectWithTask(actor, "Late");
    await prisma.task.update({ where: { id: overdue.id }, data: { dueDate: new Date(Date.now() - 3 * DAY) } });
    const done = await prisma.task.create({
      data: { tenantId: actor.tenant.tenantId, projectId: project.id, title: "Shipped", creatorId: actor.userId },
    });
    await updateTask(actor, done.id, { status: TaskStatus.DONE });
    await createProjectWithTask(other.actor, "Not ours");

    const data = await getDashboard(actor.tenant);
    expect(data.kpis).toMatchObject({ openTasks: 1, overdueTasks: 1, completedThisWeek: 1, completedLastWeek: 0 });
    expect(data.recentProjects).toHaveLength(1);
    expect(data.recentProjects[0]).toMatchObject({ totalTasks: 2, completedTasks: 1 });
  });

  it("describes activity in plain language and links to work that still exists", async () => {
    const { actor } = await createOrganization();
    const { project, task } = await createProjectWithTask(actor, "Fix login bug");
    await writeAuditLog(actor.tenant, { action: "UPDATED", entityType: "Task", entityId: task.id, metadata: { status: "DONE" } });

    const [latest] = (await getDashboard(actor.tenant)).activity;
    expect(latest).toMatchObject({ verb: "completed", target: { label: "Fix login bug", href: `/projects/${project.id}` } });
  });
});
