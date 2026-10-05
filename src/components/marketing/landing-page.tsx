import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  CreditCard,
  Database,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  SquareKanban,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoSignInButton } from "@/components/marketing/demo-sign-in-button";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

const REPO_URL = "https://github.com/De-Junior/Teamflow";
const AUTHOR_URL = "https://github.com/De-Junior";

const FEATURES = [
  {
    icon: SquareKanban,
    title: "Kanban, list and calendar",
    body: "Drag tasks across a five-stage workflow with optimistic updates that roll back if the server rejects them.",
  },
  {
    icon: ShieldCheck,
    title: "Tenant isolation by design",
    body: "Every query runs through a tenant-scoped repository, so one organization can never read another's data.",
  },
  {
    icon: Users,
    title: "Roles and permissions",
    body: "Five roles backed by one permission matrix that drives both the UI and every API check.",
  },
  {
    icon: Bell,
    title: "Realtime notifications",
    body: "Assignments push instantly over private Pusher channels, plus transactional email through Resend.",
  },
  {
    icon: BarChart3,
    title: "Analytics with AI insights",
    body: "Trend charts, team productivity and project comparisons, with Gemini summarising risks and delays.",
  },
  {
    icon: CreditCard,
    title: "Subscription billing",
    body: "Stripe Checkout and the customer portal, kept in sync by signed, idempotent webhooks.",
  },
] as const;

const ENGINEERING = [
  {
    icon: Database,
    title: "Repository layer for multi-tenancy",
    body: "Tenant data flows through scoped repositories and access guards, so the tenant filter lives in one place instead of being remembered on every query. An ID from another organization simply resolves to not found.",
  },
  {
    icon: KeyRound,
    title: "Revocable JWT sessions",
    body: "Stateless JWTs for speed, paired with a session table so users can sign out other devices. Revocation is re-checked at most every five minutes to bound database load.",
  },
  {
    icon: Lock,
    title: "Defence in depth",
    body: "Edge middleware gates every page and API route, Zod validates every payload, and permission checks run server-side even when the UI already hides the button.",
  },
  {
    icon: Zap,
    title: "Side effects never break requests",
    body: "Email, realtime pushes and audit logging are best-effort and logged. Creating a task succeeds even if a third-party provider is down.",
  },
] as const;

const STACK = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "PostgreSQL",
  "Prisma 7",
  "Auth.js v5",
  "Tailwind CSS 4",
  "dnd-kit",
  "Zod",
  "Stripe",
  "Pusher",
  "Resend",
  "Gemini",
  "Vercel",
];

const PREVIEW_COLUMNS = [
  {
    label: "To do",
    color: "var(--status-todo)",
    tasks: [
      { title: "Draft onboarding copy", tag: "Content", priority: "var(--priority-medium)" },
      { title: "Audit pricing page", tag: "Research", priority: "var(--priority-low)" },
    ],
  },
  {
    label: "In progress",
    color: "var(--status-in-progress)",
    tasks: [
      { title: "Checkout flow redesign", tag: "Design", priority: "var(--priority-high)" },
      { title: "Invite teammates by email", tag: "Feature", priority: "var(--priority-medium)" },
    ],
  },
  {
    label: "Review",
    color: "var(--status-review)",
    tasks: [{ title: "Role-based settings page", tag: "Feature", priority: "var(--priority-urgent)" }],
  },
  {
    label: "Done",
    color: "var(--status-done)",
    tasks: [
      { title: "Stripe webhook handler", tag: "Billing", priority: "var(--priority-high)" },
      { title: "Analytics dashboard", tag: "Insights", priority: "var(--priority-low)" },
    ],
  },
];

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-primary/10">
      <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
        <span className="size-2.5 rounded-full bg-[var(--priority-urgent)]" />
        <span className="size-2.5 rounded-full bg-[var(--priority-medium)]" />
        <span className="size-2.5 rounded-full bg-[var(--status-done)]" />
        <span className="ml-3 truncate text-xs text-muted-foreground">Website Redesign · Kanban</span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        {PREVIEW_COLUMNS.map((column) => (
          <div key={column.label} className="flex flex-col gap-2 rounded-lg bg-muted/60 p-2.5">
            <div className="flex items-center gap-2 px-1">
              <span className="size-2 rounded-full" style={{ backgroundColor: column.color }} />
              <span className="text-xs font-medium text-foreground">{column.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{column.tasks.length}</span>
            </div>
            {column.tasks.map((task) => (
              <div key={task.title} className="rounded-md border border-border bg-card p-2.5">
                <p className="text-xs font-medium leading-snug text-foreground">{task.title}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                    {task.tag}
                  </span>
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: task.priority }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="TeamFlow home">
            <Image
              src="/teamflow_logo.png"
              alt="TeamFlow"
              width={1877}
              height={838}
              className="logo-adaptive"
            style={{ width: "120px", height: "auto" }}
              priority
            />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#engineering" className="hover:text-foreground">Engineering</a>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">Source</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-80 max-w-3xl rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Full-stack multi-tenant SaaS, built end to end
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Projects and tasks, <span className="text-primary">in sync.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              TeamFlow gives every team its own isolated workspace with role-based access, a drag-and-drop
              Kanban board, realtime notifications, analytics with AI insights and subscription billing.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <DemoSignInButton size="lg" />
              <Button asChild size="lg" variant="outline">
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  <GitHubMark className="size-4" />
                  View the source
                </a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No sign-up needed. The demo signs you in as <span className="font-mono">{DEMO_EMAIL}</span>{" "}
              (password <span className="font-mono">{DEMO_PASSWORD}</span>) in a pre-populated workspace.
            </p>

            <div className="mt-14 w-full max-w-5xl text-left">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Features</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Everything a growing team needs to ship
              </h2>
              <p className="mt-3 text-muted-foreground">
                Each feature is fully wired end to end: database, API, permissions and UI.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-xl border border-border bg-card p-6">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-medium text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Engineering */}
        <section id="engineering" className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="text-sm font-medium text-primary">Under the hood</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Built like a real B2B product
              </h2>
              <p className="mt-3 text-muted-foreground">
                The interesting parts of TeamFlow are the decisions you can&apos;t see: how data stays
                isolated, how sessions are revoked and how failures are contained.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {STACK.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {ENGINEERING.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-xl border border-border bg-card p-6">
                  <Icon className="size-5 text-primary" />
                  <h3 className="mt-3 font-medium text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
            <Workflow className="size-8 text-primary" />
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-foreground">
              See it working with real data
            </h2>
            <p className="max-w-xl text-muted-foreground">
              The demo workspace has projects, tasks, teammates and analytics already in place, so you can
              explore every screen in under a minute.
            </p>
            <DemoSignInButton size="lg" label="Open the demo workspace" />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>
            Designed and built by{" "}
            <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
              James Junior Hlungwane
            </a>
          </p>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-foreground">
            <GitHubMark className="size-4" />
            De-Junior/Teamflow
          </a>
        </div>
      </footer>
    </div>
  );
}
