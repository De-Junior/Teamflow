// PASTE LOCATION: src/app/(auth)/reset-password/page.tsx
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-32 animate-pulse rounded-md bg-muted" />}>
          <ResetPasswordForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}