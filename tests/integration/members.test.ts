import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { changeMemberRole, removeMember, transferOwnership } from "@/services/members";
import { addMember, createOrganization, createProjectWithTask, resetDatabase } from "./fixtures";

beforeEach(resetDatabase);

describe("organization membership", () => {
  it("always keeps at least one owner", async () => {
    const { organization, actor, owner } = await createOrganization();
    const ownerMembership = await prisma.membership.findFirstOrThrow({ where: { userId: owner.id } });

    await expect(changeMemberRole(actor, ownerMembership.id, { role: Role.MANAGER })).rejects.toMatchObject({ status: 409 });

    const second = await addMember(organization.id, Role.OWNER, "Second owner");
    await expect(changeMemberRole(actor, second.membership.id, { role: Role.MANAGER })).resolves.toMatchObject({ role: Role.MANAGER });
  });

  it("refuses a transfer to yourself, and makes the old owner a manager", async () => {
    const { organization, actor, owner } = await createOrganization();
    const ownerMembership = await prisma.membership.findFirstOrThrow({ where: { userId: owner.id } });
    await expect(transferOwnership(actor, ownerMembership.id)).rejects.toMatchObject({ status: 409 });

    const next = await addMember(organization.id, Role.DEVELOPER);
    await transferOwnership(actor, next.membership.id);
    const roles = await prisma.membership.findMany({ where: { tenantId: organization.id }, select: { userId: true, role: true } });
    expect(roles).toEqual(
      expect.arrayContaining([
        { userId: next.user.id, role: Role.OWNER },
        { userId: owner.id, role: Role.MANAGER },
      ])
    );
  });

  it("unassigns a removed member's tasks and takes them off projects", async () => {
    const { organization, actor } = await createOrganization();
    const member = await addMember(organization.id);
    const { project, task } = await createProjectWithTask(actor);
    await prisma.task.update({ where: { id: task.id }, data: { assigneeId: member.user.id } });
    await prisma.projectMember.create({ data: { tenantId: organization.id, projectId: project.id, userId: member.user.id } });

    await removeMember(actor, member.membership.id);

    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).assigneeId).toBeNull();
    expect(await prisma.projectMember.count({ where: { userId: member.user.id } })).toBe(0);
    expect(await prisma.membership.count({ where: { userId: member.user.id } })).toBe(0);
  });

  it("cannot act on a membership in another organization", async () => {
    const acme = await createOrganization("Acme");
    const globex = await createOrganization("Globex");
    const theirs = await addMember(globex.organization.id);

    await expect(removeMember(acme.actor, theirs.membership.id)).rejects.toMatchObject({ status: 404 });
  });
});
