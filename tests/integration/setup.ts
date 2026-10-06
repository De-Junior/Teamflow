import { vi } from "vitest";

// Point Prisma at the test database before anything imports it, and refuse
// anything that isn't clearly a local or CI database: these tests truncate tables.
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Set TEST_DATABASE_URL to a disposable Postgres database to run integration tests.");
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "postgres"].includes(host)) {
  throw new Error(`Refusing to run integration tests against ${host}; use a local database.`);
}
process.env.DATABASE_URL = url;

// Services read the session through Auth.js; tests pass an actor directly instead.
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
// No real email or realtime traffic from tests.
vi.mock("@/lib/email/send", () => ({
  sendTaskAssignedEmail: vi.fn(async () => {}),
  sendInvitationEmail: vi.fn(async () => {}),
  sendInvitationReminderEmail: vi.fn(async () => {}),
  sendVerificationEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
}));
vi.mock("@/lib/pusher/server", () => ({ getPusher: () => ({ trigger: vi.fn(async () => {}) }) }));
