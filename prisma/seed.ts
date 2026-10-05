import { prisma } from "../src/lib/db/prisma";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../src/lib/demo";
import { resetDemoWorkspace } from "../src/lib/demo-seed";

async function main() {
  console.log("Resetting the demo workspace...");
  const result = await resetDemoWorkspace();

  console.log(`\nDemo workspace ready (${result.projects} projects).`);
  console.log(`Login:    ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
