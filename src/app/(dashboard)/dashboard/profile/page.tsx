// PASTE LOCATION: src/app/(dashboard)/dashboard/profile/page.tsx (overwrite entire file)
import { auth }         from "@/lib/auth";
import { prisma }       from "@/lib/db/prisma";
import { ProfileClient }from "@/components/profile/profile-client";

export default async function ProfilePage() {
  const session = await auth();
  const dbUser  = await prisma.user.findUnique({
    where:  { id: session!.user.id },
    select: { name: true, email: true, image: true, phone: true, timezone: true, language: true, bio: true },
  });

  return (
    <ProfileClient
      user={{
        name:     dbUser?.name ?? "",
        email:    dbUser?.email ?? "",
        image:    dbUser?.image ?? null,
        phone:    dbUser?.phone ?? "",
        timezone: dbUser?.timezone ?? "UTC",
        language: dbUser?.language ?? "en",
        bio:      dbUser?.bio ?? "",
      }}
    />
  );
}