// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { PendingInvitationsBanner } from "@/components/dashboard/pending-invitations-banner";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.organizationId) {
    redirect("/login");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true },
  });

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar organizationName={organization?.name ?? "TeamFlow"} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar
            userName={session.user.name ?? "User"}
            userEmail={session.user.email ?? ""}
            role={session.user.role}
          />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <PendingInvitationsBanner />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}