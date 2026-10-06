import Link from "next/link";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityItem } from "@/services/dashboard";
import { timeAgo } from "@/lib/utils/time-ago";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <History aria-hidden className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Changes to projects, tasks and the team will show up here.</p>
          </div>
        ) : (
          <ol className="relative flex flex-col gap-4 before:absolute before:bottom-1 before:left-[3px] before:top-1 before:w-px before:bg-border">
            {items.map((item) => (
              <li key={item.id} className="relative flex gap-3 pl-0">
                <span aria-hidden className="relative mt-1.5 size-[7px] shrink-0 rounded-full bg-primary ring-4 ring-card" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{item.actor}</span> {item.verb}
                    {item.target && (
                      <>
                        {" "}
                        {item.target.href ? (
                          <Link href={item.target.href} className="font-medium text-foreground underline-offset-2 hover:underline">
                            {item.target.label}
                          </Link>
                        ) : (
                          <span className="font-medium">{item.target.label}</span>
                        )}
                      </>
                    )}
                  </p>
                  <time dateTime={item.createdAt} className="text-xs text-muted-foreground">
                    {timeAgo(item.createdAt)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
