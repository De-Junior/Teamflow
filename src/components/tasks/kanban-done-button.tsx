// PASTE LOCATION: src/components/tasks/kanban-done-button.tsx (create new file)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export function KanbanDoneButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDone() {
    setLoading(true);
    // Flush any pending router cache so the projects page
    // shows the latest task counts immediately
    router.refresh();
    // Small delay to let the refresh settle before navigating
    await new Promise((r) => setTimeout(r, 300));
    router.push("/projects");
  }

  return (
    <Button
      onClick={handleDone}
      disabled={loading}
      className="gap-2"
    >
      <CheckCircle2 className="size-4" />
      {loading ? "Saving…" : "Done"}
    </Button>
  );
}