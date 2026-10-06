import bcrypt from "bcryptjs";
import { AuditAction, Priority, ProjectStatus, Role, TaskStatus } from "@prisma/client";
import { prisma } from "./db/prisma";
import { DEMO_EMAIL, DEMO_PASSWORD } from "./demo";

/**
 * Rebuilds the public demo workspace from scratch.
 *
 * Every date is relative to "now", so the workspace always looks current no
 * matter when a reviewer opens it. Safe to run repeatedly: it upserts the
 * organization and people, then replaces the demo organization's work items.
 * Used by `prisma/seed.ts` and by the daily `/api/cron/reset-demo` job.
 */

const DEMO_ORG_SLUG = "teamflow-demo";
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (d: number) => new Date(Date.now() + d * DAY);

const TEAMMATES = [
  { key: "ava", name: "Ava Thompson", email: "ava@teamflow-demo.com", role: Role.MANAGER },
  { key: "liam", name: "Liam Chen", email: "liam@teamflow-demo.com", role: Role.DEVELOPER },
  { key: "priya", name: "Priya Nair", email: "priya@teamflow-demo.com", role: Role.DEVELOPER },
  { key: "noah", name: "Noah Osei", email: "noah@teamflow-demo.com", role: Role.VIEWER },
] as const;

type PersonKey = "me" | (typeof TEAMMATES)[number]["key"];

type TaskSeed = {
  title: string;
  status: TaskStatus;
  priority: Priority;
  assignee: PersonKey | null;
  /** Due date offset in days (negative = overdue unless done) */
  due: number;
  /** When the task was created, in days ago */
  createdDaysAgo: number;
  /** For DONE tasks: when it was completed, in days ago */
  doneDaysAgo?: number;
  description?: string;
  labels?: { name: string; color: string }[];
  subtasks?: [string, boolean][];
  checklist?: [string, boolean][];
  comments?: [PersonKey, string][];
  time?: [PersonKey, number, string][];
};

type ProjectSeed = {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  startDaysAgo: number;
  dueInDays: number;
  createdDaysAgo: number;
  members: PersonKey[];
  tasks: TaskSeed[];
};

const LABEL = {
  design: { name: "design", color: "#8b5cf6" },
  frontend: { name: "frontend", color: "#3b82f6" },
  backend: { name: "backend", color: "#0ea5e9" },
  bug: { name: "bug", color: "#ef4444" },
  content: { name: "content", color: "#22c55e" },
  research: { name: "research", color: "#f59e0b" },
};

const PROJECTS: ProjectSeed[] = [
  {
    name: "Website Redesign",
    description: "Full revamp of the marketing site and onboarding flow ahead of the Q4 launch.",
    status: ProjectStatus.ACTIVE,
    priority: Priority.HIGH,
    startDaysAgo: 21,
    dueInDays: 18,
    createdDaysAgo: 21,
    members: ["me", "ava", "liam", "priya"],
    tasks: [
      {
        title: "Design new homepage hero section",
        status: TaskStatus.DONE, priority: Priority.HIGH, assignee: "ava",
        due: -6, createdDaysAgo: 20, doneDaysAgo: 8, labels: [LABEL.design],
        checklist: [["Get design sign-off", true], ["Export final assets", true]],
        time: [["ava", 240, "Hero section exploration"], ["ava", 90, "Revisions after review"]],
      },
      {
        title: "Implement responsive navbar",
        status: TaskStatus.DONE, priority: Priority.MEDIUM, assignee: "liam",
        due: -4, createdDaysAgo: 18, doneDaysAgo: 5, labels: [LABEL.frontend],
        time: [["liam", 180, "Navbar implementation"]],
      },
      {
        title: "Migrate pricing page to new design system",
        status: TaskStatus.DONE, priority: Priority.MEDIUM, assignee: "priya",
        due: -2, createdDaysAgo: 15, doneDaysAgo: 2, labels: [LABEL.frontend],
      },
      {
        title: "Review onboarding copy with marketing",
        status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assignee: "me",
        due: 2, createdDaysAgo: 6, labels: [LABEL.content],
        description: "Final pass on tone and length for the five onboarding screens before handoff.",
        checklist: [["Screens 1 to 3", true], ["Screens 4 and 5", false], ["Legal review", false]],
        comments: [["ava", "Marketing signed off on screens 1 to 3. Two left!"]],
      },
      {
        title: "Set up analytics dashboard",
        status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assignee: "priya",
        due: 4, createdDaysAgo: 9, labels: [LABEL.backend],
        subtasks: [["Connect data source", true], ["Build chart components", true], ["Add weekly trend view", false]],
        comments: [
          ["me", "Looking great so far. Can we add a weekly trend view too?"],
          ["priya", "Sure, adding that as a stretch goal for this sprint."],
        ],
        time: [["priya", 300, "Dashboard setup"], ["priya", 150, "Chart components"]],
      },
      {
        title: "QA pass on checkout flow",
        status: TaskStatus.REVIEW, priority: Priority.URGENT, assignee: "liam",
        due: 1, createdDaysAgo: 7, labels: [LABEL.bug],
        subtasks: [["Test on Safari", true], ["Test on mobile", false]],
        comments: [["liam", "Found an edge case with promo codes, fixing now."]],
        time: [["liam", 120, "QA testing"]],
      },
      {
        title: "Write onboarding email sequence",
        status: TaskStatus.TODO, priority: Priority.MEDIUM, assignee: "ava",
        due: 6, createdDaysAgo: 4, labels: [LABEL.content],
        checklist: [["Welcome email", true], ["Day 3 follow-up", false], ["Day 7 tips", false]],
      },
      {
        title: "Fix layout shift on blog index",
        status: TaskStatus.TODO, priority: Priority.HIGH, assignee: "liam",
        due: -1, createdDaysAgo: 5, labels: [LABEL.bug, LABEL.frontend],
      },
      {
        title: "Accessibility audit",
        status: TaskStatus.BACKLOG, priority: Priority.MEDIUM, assignee: null,
        due: 20, createdDaysAgo: 3, labels: [LABEL.research],
      },
    ],
  },
  {
    name: "Mobile App Launch",
    description: "iOS and Android release with push notifications and offline support.",
    status: ProjectStatus.ACTIVE,
    priority: Priority.MEDIUM,
    startDaysAgo: 5,
    dueInDays: 40,
    createdDaysAgo: 5,
    members: ["me", "ava", "liam"],
    tasks: [
      {
        title: "Finalize App Store listing copy",
        status: TaskStatus.TODO, priority: Priority.MEDIUM, assignee: "me",
        due: 5, createdDaysAgo: 4, labels: [LABEL.content],
      },
      {
        title: "Push notification permissions flow",
        status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assignee: "liam",
        due: 8, createdDaysAgo: 5, labels: [LABEL.frontend],
        time: [["liam", 210, "Permission prompts"]],
      },
      {
        title: "Offline sync conflict strategy",
        status: TaskStatus.BACKLOG, priority: Priority.HIGH, assignee: "priya",
        due: 15, createdDaysAgo: 2, labels: [LABEL.backend, LABEL.research],
      },
      {
        title: "Set up crash reporting",
        status: TaskStatus.DONE, priority: Priority.MEDIUM, assignee: "liam",
        due: -1, createdDaysAgo: 5, doneDaysAgo: 3, labels: [LABEL.backend],
      },
    ],
  },
  {
    name: "Customer Feedback Portal",
    description: "Public roadmap and feature voting so customers can see what's coming next.",
    status: ProjectStatus.ON_HOLD,
    priority: Priority.LOW,
    startDaysAgo: 30,
    dueInDays: 60,
    createdDaysAgo: 30,
    members: ["me", "priya", "noah"],
    tasks: [
      {
        title: "Interview five customers about the roadmap",
        status: TaskStatus.DONE, priority: Priority.MEDIUM, assignee: "me",
        due: -10, createdDaysAgo: 28, doneDaysAgo: 11, labels: [LABEL.research],
      },
      {
        title: "Voting API design doc",
        status: TaskStatus.REVIEW, priority: Priority.MEDIUM, assignee: "priya",
        due: 3, createdDaysAgo: 10, labels: [LABEL.backend],
        comments: [["me", "Rate limiting per account would be good to cover here."]],
      },
      {
        title: "Roadmap page wireframes",
        status: TaskStatus.TODO, priority: Priority.LOW, assignee: "ava",
        due: 12, createdDaysAgo: 3, labels: [LABEL.design],
      },
    ],
  },
];

export async function resetDemoWorkspace() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    update: { name: "TeamFlow Demo Co.", archivedAt: null },
    create: {
      name: "TeamFlow Demo Co.",
      slug: DEMO_ORG_SLUG,
      industry: "Software",
      website: "https://teamflow-rosy-three.vercel.app",
    },
  });

  const subscription = {
    plan: "PROFESSIONAL" as const,
    status: "ACTIVE" as const,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    cancelAtPeriodEnd: false,
    currentPeriodStart: daysFromNow(-10),
    currentPeriodEnd: daysFromNow(20),
  };
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: subscription,
    create: { organizationId: org.id, ...subscription },
  });

  // People: reset the demo owner's profile and password every time so a
  // visitor's edits never carry over to the next visitor.
  const me = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: "Demo Recruiter",
      password: passwordHash,
      image: null,
      bio: "Evaluating TeamFlow for our hiring pipeline.",
      emailVerified: new Date(),
    },
    create: {
      name: "Demo Recruiter",
      email: DEMO_EMAIL,
      password: passwordHash,
      timezone: "Africa/Johannesburg",
      bio: "Evaluating TeamFlow for our hiring pipeline.",
      emailVerified: new Date(),
    },
  });

  const people: Record<PersonKey, { id: string; name: string | null }> = { me } as never;
  const memberships: { userId: string; role: Role }[] = [{ userId: me.id, role: Role.OWNER }];

  for (const t of TEAMMATES) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: { name: t.name },
      create: { name: t.name, email: t.email, password: passwordHash, emailVerified: new Date() },
    });
    people[t.key] = user;
    memberships.push({ userId: user.id, role: t.role });
  }

  for (const m of memberships) {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: m.userId, organizationId: org.id } },
      update: { role: m.role },
      create: { tenantId: org.id, organizationId: org.id, userId: m.userId, role: m.role },
    });
  }

  await prisma.userPreferences.upsert({
    where: { userId: me.id },
    update: {},
    create: { userId: me.id },
  });

  // Work items: wipe and rebuild. Projects cascade to tasks and their children.
  await prisma.$transaction([
    prisma.project.deleteMany({ where: { tenantId: org.id } }),
    prisma.invitation.deleteMany({ where: { organizationId: org.id } }),
    prisma.notification.deleteMany({ where: { organizationId: org.id } }),
    prisma.auditLog.deleteMany({ where: { organizationId: org.id } }),
  ]);

  const audit: {
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    metadata?: object;
    createdAt: Date;
  }[] = [];

  for (const p of PROJECTS) {
    const project = await prisma.project.create({
      data: {
        tenantId: org.id,
        organizationId: org.id,
        name: p.name,
        description: p.description,
        status: p.status,
        priority: p.priority,
        startDate: daysFromNow(-p.startDaysAgo),
        dueDate: daysFromNow(p.dueInDays),
        createdAt: daysFromNow(-p.createdDaysAgo),
        members: {
          create: p.members.map((key) => ({ tenantId: org.id, userId: people[key].id })),
        },
      },
    });
    audit.push({
      userId: me.id,
      action: AuditAction.CREATED,
      entityType: "Project",
      entityId: project.id,
      metadata: { name: p.name },
      createdAt: daysFromNow(-p.createdDaysAgo),
    });

    const positions: Partial<Record<TaskStatus, number>> = {};
    for (const t of p.tasks) {
      const createdAt = daysFromNow(-t.createdDaysAgo);
      const updatedAt = t.doneDaysAgo !== undefined ? daysFromNow(-t.doneDaysAgo) : daysFromNow(-Math.min(1, t.createdDaysAgo));
      const position = positions[t.status] ?? 0;
      positions[t.status] = position + 1;

      const task = await prisma.task.create({
        data: {
          tenantId: org.id,
          projectId: project.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          position,
          dueDate: daysFromNow(t.due),
          assigneeId: t.assignee ? people[t.assignee].id : null,
          creatorId: me.id,
          createdAt,
          updatedAt,
          completedAt: t.status === TaskStatus.DONE ? updatedAt : null,
          labels: t.labels ? { create: t.labels } : undefined,
          subtasks: t.subtasks
            ? { create: t.subtasks.map(([title, completed], i) => ({ title, completed, position: i })) }
            : undefined,
          checklistItems: t.checklist
            ? { create: t.checklist.map(([title, checked], i) => ({ title, checked, position: i })) }
            : undefined,
          comments: t.comments
            ? {
                create: t.comments.map(([author, content], i) => ({
                  tenantId: org.id,
                  authorId: people[author].id,
                  content,
                  createdAt: new Date(createdAt.getTime() + (i + 1) * 6 * 60 * 60 * 1000),
                })),
              }
            : undefined,
          timeEntries: t.time
            ? {
                create: t.time.map(([user, minutes, note], i) => ({
                  userId: people[user].id,
                  minutes,
                  note,
                  createdAt: new Date(createdAt.getTime() + (i + 1) * DAY),
                })),
              }
            : undefined,
        },
      });

      audit.push({
        userId: me.id,
        action: AuditAction.CREATED,
        entityType: "Task",
        entityId: task.id,
        metadata: { title: t.title },
        createdAt,
      });
      if (t.status === TaskStatus.DONE) {
        audit.push({
          userId: t.assignee ? people[t.assignee].id : me.id,
          action: AuditAction.UPDATED,
          entityType: "Task",
          entityId: task.id,
          metadata: { status: "DONE" },
          createdAt: updatedAt,
        });
      }

      if (t.assignee === "me") {
        await prisma.notification.create({
          data: {
            tenantId: org.id,
            organizationId: org.id,
            userId: me.id,
            type: "TASK_ASSIGNED",
            title: "Task assigned to you",
            body: `You were assigned "${t.title}" in ${p.name}`,
            entityId: task.id,
            entityType: "task",
            read: t.status === TaskStatus.DONE,
            createdAt,
          },
        });
      }
    }
  }

  await prisma.auditLog.createMany({
    data: audit.map((a) => ({ ...a, tenantId: org.id, organizationId: org.id })),
  });

  return { organizationId: org.id, projects: PROJECTS.length };
}
