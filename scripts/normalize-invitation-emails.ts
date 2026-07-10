import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const invitations = await prisma.invitation.findMany({
    select: { id: true, email: true, status: true },
  });

  for (const inv of invitations) {
    const normalized = inv.email.trim().toLowerCase();
    if (normalized !== inv.email) {
      console.log(`Updating invitation ${inv.id}: "${inv.email}" -> "${normalized}"`);
      await prisma.invitation.update({
        where: { id: inv.id },
        data: { email: normalized },
      });
    }
  }

  console.log("Done.");
}

main().finally(() => process.exit(0));