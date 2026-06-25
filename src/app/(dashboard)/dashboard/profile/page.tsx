// PASTE LOCATION: src/app/(dashboard)/dashboard/profile/page.tsx (overwrite entire file)
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  const user    = session!.user;

  const dbUser = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { password: true },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal account settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialName={user.name ?? ""}
            email={user.email ?? ""}
            role={user.role ?? "VIEWER"}
            hasPassword={!!dbUser?.password}
          />
        </CardContent>
      </Card>
    </div>
  );
}