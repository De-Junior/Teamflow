// PASTE LOCATION: src/components/dashboard/widgets/quick-actions.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FolderPlus, UserPlus, ListPlus, Upload } from "lucide-react";

export function QuickActions({ canInvite }: { canInvite: boolean }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => router.push("/projects")}>
        <FolderPlus className="size-3.5" />
        New project
      </Button>
      {canInvite && (
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/team")}>
          <UserPlus className="size-3.5" />
          Invite member
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => router.push("/projects")}>
        <ListPlus className="size-3.5" />
        Create task
      </Button>
      <Button variant="outline" size="sm" disabled title="Coming soon">
        <Upload className="size-3.5" />
        Upload file
      </Button>
    </div>
  );
}