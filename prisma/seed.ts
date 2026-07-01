import { Role, ProjectStatus, Priority, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db/prisma";

// Change these if you want different demo credentials
const RECRUITER_EMAIL = "recruiter@teamflow-demo.com";
const RECRUITER_PASSWORD = "Demo1234!";

async function main() {
  console.log("Seeding recruiter demo data...");

  const hashedPassword = await bcrypt.hash(RECRUITER_PASSWORD, 10);

  // ── Organization ─────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "teamflow-demo" },
    update: {},
    create: {
      name: "TeamFlow Demo Co.",
      slug: "teamflow-demo",
      industry: "Software",
      website: "https://teamflow-rosy-three.vercel.app",
    },
  });

  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // ── Recruiter (owner) account ────────────────────────────────
  const recruiter = await prisma.user.upsert({
    where: { email: RECRUITER_EMAIL },
    update: {},
    create: {
      name: "Demo Recruiter",
      email: RECRUITER_EMAIL,
      password: hashedPassword,
      timezone: "Africa/Johannesburg",
      bio: "Evaluating TeamFlow for our hiring pipeline.",
    },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: recruiter.id, organizationId: org.id } },
    update: {},
    create: {
      tenantId: org.id,
      userId: recruiter.id,
      organizationId: org.id,
      role: Role.OWNER,
    },
  });

  await prisma.userPreferences.upsert({
    where: { userId: recruiter.id },
    update: {},
    create: { userId: recruiter.id },
  });

  // ── Teammates (so team views / analytics aren't empty) ───────
  const teammateData = [
    { name: "Ava Thompson", email: "ava@teamflow-demo.com", role: Role.MANAGER },
    { name: "Liam Chen", email: "liam@teamflow-demo.com", role: Role.DEVELOPER },
    { name: "Priya Nair", email: "priya@teamflow-demo.com", role: Role.DEVELOPER },
    { name: "Noah Osei", email: "noah@teamflow-demo.com", role: Role.VIEWER },
  ];

  const teammates = [];
  for (const t of teammateData) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: { name: t.name, email: t.email, password: hashedPassword },
    });
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      update: {},
      create: { tenantId: org.id, userId: user.id, organizationId: org.id, role: t.role },
    });
    teammates.push(user);
  }

  const [ava, liam, priya] = teammates;

  // ── Projects ──────────────────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      tenantId: org.id,
      organizationId: org.id,
      name: "Website Redesign",
      description: "Full revamp of the marketing site and onboarding flow.",
      status: ProjectStatus.ACTIVE,
      priority: Priority.HIGH,
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    },
  });

  const secondProject = await prisma.project.create({
    data: {
      tenantId: org.id,
      organizationId: org.id,
      name: "Mobile App Launch",
      description: "iOS and Android release for Q3.",
      status: ProjectStatus.ACTIVE,
      priority: Priority.MEDIUM,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    },
  });

  // ── Tasks for main project ───────────────────────────────────
  const taskDefs = [
    {
      title: "Design new homepage hero section",
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      assigneeId: ava.id,
      creatorId: recruiter.id,
      position: 0,
      daysAgoDue: -5,
    },
    {
      title: "Implement responsive navbar",
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      assigneeId: liam.id,
      creatorId: recruiter.id,
      position: 1,
      daysAgoDue: -3,
    },
    {
      title: "Set up analytics dashboard",
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      assigneeId: priya.id,
      creatorId: recruiter.id,
      position: 2,
      daysAgoDue: 3,
    },
    {
      title: "Write onboarding email sequence",
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      assigneeId: ava.id,
      creatorId: recruiter.id,
      position: 3,
      daysAgoDue: 5,
    },
    {
      title: "QA pass on checkout flow",
      status: TaskStatus.REVIEW,
      priority: Priority.URGENT,
      assigneeId: liam.id,
      creatorId: recruiter.id,
      position: 4,
      daysAgoDue: 1,
    },
    {
      title: "Migrate blog to new CMS",
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      assigneeId: priya.id,
      creatorId: recruiter.id,
      position: 5,
      daysAgoDue: 14,
    },
    {
      title: "Accessibility audit",
      status: TaskStatus.BACKLOG,
      priority: Priority.MEDIUM,
      assigneeId: null,
      creatorId: recruiter.id,
      position: 6,
      daysAgoDue: 20,
    },
  ];

  const createdTasks = [];
  for (const t of taskDefs) {
    const task = await prisma.task.create({
      data: {
        tenantId: org.id,
        projectId: project.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        creatorId: t.creatorId,
        position: t.position,
        dueDate: new Date(Date.now() + t.daysAgoDue * 24 * 60 * 60 * 1000),
      },
    });
    createdTasks.push(task);
  }

  // A couple of tasks for the second project too
  await prisma.task.createMany({
    data: [
      {
        tenantId: org.id,
        projectId: secondProject.id,
        title: "Finalize App Store listing copy",
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        creatorId: recruiter.id,
        assigneeId: ava.id,
        position: 0,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
      {
        tenantId: org.id,
        projectId: secondProject.id,
        title: "Push notification testing",
        status: TaskStatus.BACKLOG,
        priority: Priority.LOW,
        creatorId: recruiter.id,
        assigneeId: liam.id,
        position: 1,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // ── Labels ────────────────────────────────────────────────────
  await prisma.taskLabel.createMany({
    data: [
      { taskId: createdTasks[0].id, name: "design", color: "#8b5cf6" },
      { taskId: createdTasks[2].id, name: "backend", color: "#0ea5e9" },
      { taskId: createdTasks[4].id, name: "bug", color: "#ef4444" },
      { taskId: createdTasks[5].id, name: "content", color: "#22c55e" },
    ],
  });

  // ── Subtasks & checklist items ──────────────────────────────────
  await prisma.subTask.createMany({
    data: [
      { taskId: createdTasks[2].id, title: "Connect data source", completed: true, position: 0 },
      { taskId: createdTasks[2].id, title: "Build chart components", completed: false, position: 1 },
      { taskId: createdTasks[4].id, title: "Test on Safari", completed: true, position: 0 },
      { taskId: createdTasks[4].id, title: "Test on mobile", completed: false, position: 1 },
    ],
  });

  await prisma.checklistItem.createMany({
    data: [
      { taskId: createdTasks[0].id, title: "Get design sign-off", checked: true, position: 0 },
      { taskId: createdTasks[0].id, title: "Export final assets", checked: true, position: 1 },
      { taskId: createdTasks[3].id, title: "Draft welcome email", checked: true, position: 0 },
      { taskId: createdTasks[3].id, title: "Draft day-3 follow-up", checked: false, position: 1 },
    ],
  });

  // ── Comments ─────────────────────────────────────────────────
  await prisma.comment.createMany({
    data: [
      {
        tenantId: org.id,
        taskId: createdTasks[2].id,
        authorId: recruiter.id,
        content: "Looking great so far — can we add a weekly trend view too?",
      },
      {
        tenantId: org.id,
        taskId: createdTasks[2].id,
        authorId: priya.id,
        content: "Sure, adding that as a stretch goal for this sprint.",
      },
      {
        tenantId: org.id,
        taskId: createdTasks[4].id,
        authorId: liam.id,
        content: "Found an edge case with promo codes, fixing now.",
      },
    ],
  });

  // ── Time entries ─────────────────────────────────────────────
  await prisma.timeEntry.createMany({
    data: [
      { taskId: createdTasks[0].id, userId: ava.id, minutes: 240, note: "Hero section design" },
      { taskId: createdTasks[1].id, userId: liam.id, minutes: 180, note: "Navbar implementation" },
      { taskId: createdTasks[2].id, userId: priya.id, minutes: 300, note: "Dashboard setup" },
      { taskId: createdTasks[4].id, userId: liam.id, minutes: 120, note: "QA testing" },
    ],
  });

  console.log("\n✅ Seed complete!");
  console.log("──────────────────────────────────────────");
  console.log(`Recruiter login: ${RECRUITER_EMAIL}`);
  console.log(`Password:        ${RECRUITER_PASSWORD}`);
  console.log("──────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });