import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[EMAIL_CLIENT] RESEND_API_KEY is not set. Emails will fail to send.");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "TeamFlow <onboarding@resend.dev>";
