import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">This page doesn&apos;t exist</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The link may be broken, or the page may have been moved or deleted.
      </p>
      <Button asChild>
        <Link href="/">Go to TeamFlow</Link>
      </Button>
    </main>
  );
}
