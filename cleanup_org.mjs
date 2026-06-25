// PASTE LOCATION: project root (same folder as package.json) — run once, then delete
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const orgId = process.argv[2];
const isDryRun = process.argv.includes("--dry-run");

if (!orgId) {
  console.error("Usage: node cleanup_org.mjs <organizationId> [--dry-run]");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      memberships: { include: { user: { select: { name: true, email: true } } } },
      projects: true,
    },
  });

  if (!org) {
    console.log(`No organization found with id ${orgId}. Nothing to do.`);
    return;
  }

  console.log(`Organization: ${org.name} (${org.id})`);
  console.log(`Members (${org.memberships.length}):`);
  for (const m of org.memberships) {
    console.log(`  - ${m.user.name ?? m.user.email} (${m.role})`);
  }
  console.log(`Projects: ${org.projects.length}`);

  if (isDryRun) {
    console.log("\n--dry-run: nothing was deleted. Re-run without --dry-run to actually delete.");
    return;
  }

  await prisma.organization.delete({ where: { id: orgId } });
  console.log(`\nDeleted organization ${org.name} (${org.id}) and all related records.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());