/**
 * The public demo account. Its credentials are intentionally public (they're
 * on the landing page and in the README) so reviewers can explore a populated
 * workspace without signing up. `prisma/seed.ts` creates it.
 */
export const DEMO_EMAIL = "recruiter@teamflow-demo.com";
export const DEMO_PASSWORD = "Demo1234!";

export function isDemoAccount(email: string | null | undefined) {
  return email?.toLowerCase() === DEMO_EMAIL;
}
