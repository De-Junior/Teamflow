// PASTE LOCATION: src/components/ui/card.tsx (overwrite entire file)
import { cn } from "@/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> };

function Card({ className, ref, ...props }: DivProps) {
  return (
    <div
      ref={ref}
      className={cn("rounded-lg border border-border bg-card shadow-sm", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ref, ...props }: DivProps) {
  return <div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

function CardTitle({ className, ref, ...props }: DivProps) {
  return (
    <div ref={ref} className={cn("text-lg font-semibold leading-none", className)} {...props} />
  );
}

function CardDescription({ className, ref, ...props }: DivProps) {
  return <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ref, ...props }: DivProps) {
  return <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />;
}

function CardFooter({ className, ref, ...props }: DivProps) {
  return <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };