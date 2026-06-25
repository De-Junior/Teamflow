// PASTE LOCATION: src/app/page.tsx (overwrite the entire existing file — delete everything in it first)
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
}