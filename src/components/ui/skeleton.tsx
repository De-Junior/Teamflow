import { cn } from "@/lib/utils";

/** A pulsing placeholder in the shape of the content that is loading. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

/** A few skeleton rows, announced once to screen readers as "Loading". */
export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" className={cn("flex flex-col gap-2", className)}>
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
