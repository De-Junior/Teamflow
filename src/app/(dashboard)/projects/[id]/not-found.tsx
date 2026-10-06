import Link from "next/link";
import { FolderX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/state";

export default function ProjectNotFound() {
  return (
    <EmptyState
      className="mx-auto mt-10 max-w-lg"
      icon={FolderX}
      title="Project not found"
      description="It may have been deleted, or it belongs to an organization you're not signed in to."
      action={
        <Button asChild size="sm">
          <Link href="/projects">Back to projects</Link>
        </Button>
      }
    />
  );
}
