// PASTE LOCATION: src/lib/email/client.ts (new file)
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.error("[EMAIL_CLIENT] RESEND_API_KEY is not set. Emails will fail to send.");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "TeamFlow <onboarding@resend.dev>";