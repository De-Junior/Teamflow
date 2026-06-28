// PASTE LOCATION: src/components/dashboard/widgets/open-invitations.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowRight } from "lucide-react";

export type OpenInvitation = {
  id: string;
  email: string;
  role: string;
};

export function OpenInvitationsWidget({ invitations }: { invitations: OpenInvitation[] }) {
  if (invitations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          Open invitations
          <span className="ml-1.5 text-sm font-normal text-muted-foreground">
            ({invitations.length})
          </span>
        </CardTitle>
        <Link
          href="/dashboard/team"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Manage
          <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        {invitations.slice(0, 4).map((invite) => (
          <div key={invite.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <Mail className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm text-foreground">{invite.email}</span>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
              {invite.role.toLowerCase()}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}