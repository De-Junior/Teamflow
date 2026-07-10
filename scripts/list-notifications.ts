import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  console.log(JSON.stringify(notifications, null, 2));
}

main().finally(() => process.exit(0));