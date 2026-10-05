import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AcceptInvite } from "@/components/auth/accept-invite";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <Card>
      <CardHeader>
        <CardTitle>You&apos;re invited</CardTitle>
        <CardDescription>Join your team on TeamFlow.</CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInvite token={token} />
      </CardContent>
    </Card>
  );
}