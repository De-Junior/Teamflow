import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/marketing/landing-page";

export default async function Home() {
  const session = await auth();
  if (session?.user?.organizationId) redirect("/dashboard");
  return <LandingPage />;
}
