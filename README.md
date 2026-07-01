<div align="center">

# TeamFlow

**Multi-tenant project & task management platform built with Next.js 16, React 19, and PostgreSQL**

A production-style SaaS application demonstrating tenant isolation, role-based access control, real-time-feeling collaboration, and a full project/task management workflow — built end-to-end as a portfolio engineering project.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Auth.js](https://img.shields.io/badge/Auth.js-v5_beta-8B5CF6)](https://authjs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)

`docs/banner.png` — *(placeholder — add a hero screenshot or product banner here)*

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [System Design](#system-design)
- [Folder Structure](#folder-structure)
- [Database](#database)
- [Authentication](#authentication)
- [Security](#security)
- [Performance Optimizations](#performance-optimizations)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Screenshots](#screenshots)
- [API Overview](#api-overview)
- [Development Workflow](#development-workflow)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)
- [How I Would Present This Project in an Interview](#how-i-would-present-this-project-in-an-interview)
- [Project Highlights](#project-highlights)

---

## Overview

TeamFlow is a multi-tenant project management application — think a focused, self-built alternative to tools like Linear or Trello, scoped to demonstrate the architecture and engineering decisions that go into a real B2B SaaS product rather than a CRUD demo.

**The problem it addresses:** small-to-mid-sized teams need a shared place to plan projects, track tasks through a workflow, and manage who has access to what — without every team's data being visible to every other team using the same application instance.

**Why it was built this way:** every business-data table in the schema carries a `tenantId`, and all reads/writes are routed through tenant-scoped repository functions (`src/lib/db/tenant.ts`) rather than calling Prisma directly from routes. This was a deliberate architectural choice to make cross-tenant data leakage structurally difficult rather than something developers have to remember to guard against on every single query.

The application was built iteratively, feature by feature, with each addition reviewed against the actual existing code before being written — including catching and fixing real bugs along the way (stale Kanban positions on drag, permission mismatches between roles, a JWT/Edge-runtime conflict in session revocation, and others documented in the codebase's audit trail of decisions).

---

## Features

> Only features with working, reviewed implementation are listed as complete. Anything scaffolded but not wired up is explicitly marked **Planned**.

### Authentication
- Email/password login via Credentials provider (Auth.js v5)
- Google OAuth login, with account linking enabled for existing email/password users
- Email verification gate on credentials login
- Forgot password → reset password flow via time-limited verification tokens
- Password reuse prevention (new password is checked against the current hash via bcrypt)
- Visible/hide password toggle on all password fields

### Organization & Multi-Tenancy
- Every business table (`Project`, `Task`, `Comment`, `File`, `Invitation`, `AuditLog`, etc.) carries an explicit `tenantId`
- Tenant-scoped repository layer (`projectRepository`, `taskRepository`) — every query is automatically filtered by tenant, with no way to accidentally omit it
- Organization settings page — name editing (Owner only)

### Project Management
- Full CRUD on projects with status, priority, due dates, descriptions
- Search (name + description), filters (status, priority, archived), 5 sort modes, pagination
- Bulk actions — delete and archive across multiple selected projects
- Duplicate project (copies metadata, not tasks, by design)
- Edit-in-place dialog with optimistic UI

### Task Management (Kanban)
- 5-column Kanban board (Backlog → To do → In Progress → Review → Done) with drag-and-drop via `dnd-kit`
- Cross-column and within-column reordering, with both source and target column positions persisted correctly on every drag (a real bug — only the target column was being saved — was identified and fixed during development)
- List view and Calendar view as alternate ways to browse the same task data
- Task detail modal with tabs: Details (inline editable fields), Subtasks, Checklist (with progress bar), Comments, Time tracking, Activity log
- Task labels (custom name + color)
- Client-side instant filtering by assignee, priority, status, and search

### Team Collaboration
- Role-based team directory with search and role filtering
- Invite by email with role assignment, resend, and revoke
- Per-member read-only profile pages (assigned tasks, active projects, recent activity)
- Comments on tasks with author attribution and delete permissions

### Analytics
- KPI summary (projects, tasks, members, completions)
- Tasks-by-status and tasks-by-priority breakdowns
- Organization-wide recent activity feed (sourced from the audit log)

### Profile & Account
- Editable personal info (name, phone, timezone, language, bio)
- Avatar upload UI (gracefully reports "not configured" until S3 credentials are supplied — see [Future Improvements](#future-improvements))
- Theme preference (light/dark/system) — custom-built provider with `localStorage` cache and flash-of-unstyled-theme prevention, persisted to the database per user
- Notification preferences (stored, not yet dispatched — see below)
- Connected accounts panel (Google link/unlink, with a guard preventing a user from removing their only sign-in method)
- Multi-device session list with per-device and "sign out all other devices" revocation (custom-built — see [Authentication](#authentication) for why this isn't simply Auth.js's database session strategy)
- Personal activity log, assigned-task breakdown (upcoming/completed/overdue), and personal statistics

### Security
- bcrypt password hashing (cost factor 12)
- Zod schema validation on every API route's input
- Role-based authorization checks (`requirePermission`) on every mutating endpoint, not just hidden UI elements
- Edge-safe middleware (`proxy.ts`) enforcing authentication on all non-public routes before they reach a page or API handler
- Tenant-mismatch guard on API requests carrying an `x-organization-id` header

### Admin / RBAC Features
- 5-tier role hierarchy: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `DEVELOPER`, `VIEWER`
- Centralized permission matrix (`src/lib/auth/permissions.ts`) — a single source of truth checked both for UI rendering and API authorization, rather than duplicated logic in each
- Full audit log of created/updated/deleted/role-changed events per organization

### Developer Experience
- Strict TypeScript across the codebase
- Centralized Zod validation schemas shared between client forms and API routes
- Consistent tenant-scoped repository pattern instead of ad hoc Prisma calls
- ESLint (Next.js core-web-vitals + TypeScript config) and Prettier with Tailwind class sorting

### Planned (scaffolded, not implemented)
The following packages are installed and partially stubbed but are **not functional yet** — flagged here explicitly rather than glossed over:
- **Real-time updates** (`socket.io`) — the app currently uses 30-second client polling (`router.refresh()`) as a deliberate, simpler stand-in
- **Redis-backed features** (`ioredis`) — no Redis URL configured; not in use
- **Background jobs** (`bullmq`) — installed, not wired to any job
- **Transactional email** (`resend`, `nodemailer`) — invite links are currently logged to the server console in development instead of emailed
- **File storage** (`@aws-sdk/client-s3`) — avatar/file upload endpoints exist and respond gracefully with a "storage not configured" message until AWS credentials are supplied
- **AI features** (`openai`) — package installed, unused
- **Billing** (`stripe`) — package and webhook route scaffolded, not implemented
- **In-app notifications** — a `Notification` Prisma model exists, but no API or UI consumes it yet
- **State management** (`zustand`) and **data fetching** (`@tanstack/react-query`) — installed but the app currently uses native `fetch` + React state for client data; not yet adopted

---

## Architecture

TeamFlow follows a **layered, tenant-first architecture** on top of the Next.js App Router:

```
UI (Server & Client Components)
        ↓
API Route Handlers (src/app/api/**)
        ↓
Authorization layer (src/lib/auth/permissions.ts)
        ↓
Tenant-scoped repository layer (src/lib/db/tenant.ts)
        ↓
Prisma Client → PostgreSQL (Neon)
```

**Why this layering:** the repository layer exists specifically so that no API route can forget to scope a query by `tenantId` — the function signature requires a `TenantContext`, and the `where` clause is injected automatically inside the repository, not left to each route author to remember. Authorization (`requirePermission`) is checked before any database write, and the same permission matrix is read by client components to decide what UI to render — so the "can this role see this button" and "can this role actually perform this action" logic can never drift apart.

Server Components are used by default for all data-fetching pages (dashboard, projects list, project detail, settings, analytics). Client Components are used only where interactivity is required — drag-and-drop boards, dialogs, forms with live validation, polling-based data refresh.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 16 (App Router, Turbopack) | Framework — file-based routing, Server/Client Components, route handlers |
| React 19 | UI library |
| TypeScript 5 (strict mode) | Type safety across the entire codebase |
| Tailwind CSS 4 | Utility-first styling |
| Radix UI primitives | Accessible unstyled components (Dialog, Dropdown, Select, Avatar, Tabs, Tooltip, Toast) |
| `class-variance-authority` + `tailwind-merge` | shadcn/ui-style variant-driven component styling |
| `lucide-react` | Icon set |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Kanban drag-and-drop |
| `react-hook-form` + `@hookform/resolvers` | Form state and validation wiring |

### Backend
| Technology | Purpose |
|---|---|
| Next.js Route Handlers | REST-style API endpoints under `src/app/api/**` |
| Auth.js (NextAuth) v5 beta | Authentication — Credentials + Google OAuth |
| `bcryptjs` | Password hashing |
| Zod | Runtime schema validation, shared between forms and API routes |

### Database
| Technology | Purpose |
|---|---|
| PostgreSQL (hosted on Neon) | Primary relational database |
| Prisma 7 (`@prisma/adapter-pg`) | ORM, migrations, and type-safe query builder |

### Validation
| Technology | Purpose |
|---|---|
| Zod | All API input validation; types inferred directly from schemas to avoid drift between validation and TypeScript types |

### Deployment & Tooling
| Technology | Purpose |
|---|---|
| ESLint (`eslint-config-next`) | Linting — Next.js core-web-vitals + TypeScript rules |
| Prettier + `prettier-plugin-tailwindcss` | Formatting, with automatic Tailwind class sorting |
| Sentry SDK (`@sentry/nextjs`) | Installed for error monitoring — `SENTRY_DSN` not yet configured |

**Why these choices:** Prisma was chosen over a raw query builder for type safety on a schema this relational (12+ models with cross-references), at the cost of needing the explicit `tenantId` repository discipline described above. Auth.js v5 was chosen for its native Next.js App Router support and built-in Credentials + OAuth provider pattern, accepting the tradeoff that Credentials-based login forces JWT session strategy (see [Authentication](#authentication) for how multi-device session management was built around that constraint rather than against it).

---

## System Design

### Request Lifecycle
1. Request hits `src/proxy.ts` (the project's middleware, registered via Next.js's middleware convention)
2. `proxy.ts` checks the route against a public-route allowlist; unauthenticated requests to protected routes are redirected to `/login` with a `callbackUrl`
3. For API routes, a tenant-mismatch check runs if an `x-organization-id` header is present
4. The route handler or Server Component calls `auth()` to get the session, builds a `TenantContext`, and calls into the repository layer
5. `requirePermission()` is checked before any mutation; a failed check returns `403` before touching the database

### Authentication Flow
- **Credentials login:** email/password → `bcrypt.compare` against the stored hash → `EMAIL_NOT_VERIFIED` thrown if unverified → JWT issued
- **Google OAuth:** standard Auth.js OAuth flow, with `allowDangerousEmailAccountLinking: true` so a user who registered with a password can also sign in with Google on the same email
- **Session strategy:** JWT (required by the Credentials provider — Auth.js does not support database sessions alongside Credentials). To still support "view active sessions" and "sign out other devices," a custom `ActiveSession` table was added: each login writes a row with a random `sessionId` embedded in the JWT; the `jwt` callback re-checks that row (at most every 5 minutes, and only outside the Edge runtime, since Prisma's standard driver cannot open connections from Edge) and forces a sign-out if it's been marked revoked

### Authorization
- A single permission matrix (`Record<Role, Permission[]>`) in `src/lib/auth/permissions.ts` is the only place role-to-permission mappings are defined
- `hasPermission()` is used for UI rendering decisions (e.g., hiding a Delete button)
- `requirePermission()` (which throws `UnauthorizedError`) is used inside every API route that mutates data, independent of whatever the UI shows

### Multi-Tenancy
- Tenant isolation is enforced at the repository layer, not the UI layer — even a malformed or malicious request cannot read or write another tenant's `Project` or `Task` rows, because the repository functions hard-inject `tenantId` into every `where` clause

### Database Access
- All access goes through Prisma's generated client via `src/lib/db/prisma.ts`
- Business-entity access (`Project`, `Task`) goes through `src/lib/db/tenant.ts` repository functions; auxiliary lookups (memberships, invitations, audit logs) call Prisma directly within already-tenant-scoped route handlers

### Session Handling
See Authentication Flow above — JWT-based, with custom revocation tracking layered on top rather than relying on Auth.js's database session strategy (which is incompatible with Credentials login).

### API Design
- REST-style, resource-oriented routes under `src/app/api/**`, following Next.js's file-based route handler convention
- Consistent response shape: `{ success: boolean, data?, message? }`
- Validation errors return `400`, authorization failures `403`, missing resources `404`

---

## Folder Structure

```
teamflow/
├── prisma/
│   ├── schema.prisma          # Full data model — see Database section
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, register, password reset, invite acceptance
│   │   ├── (dashboard)/       # All authenticated app pages
│   │   │   ├── dashboard/     # Overview + profile + team
│   │   │   ├── projects/      # Project list + project detail (Kanban/List/Calendar)
│   │   │   ├── settings/      # Organization + member settings
│   │   │   └── analytics/
│   │   └── api/               # Route handlers — auth, projects, tasks, members,
│   │                          # invitations, users, organizations, comments,
│   │                          # subtasks, checklist, time entries, labels
│   ├── components/
│   │   ├── auth/              # Login/register/reset forms
│   │   ├── dashboard/         # Sidebar, topbar, invitation banner
│   │   ├── projects/          # Project cards, filters, edit/duplicate dialogs
│   │   ├── tasks/              # Kanban board/column/card, task detail modal, list & calendar views
│   │   ├── team/                # Member rows, invitation rows, invite dialog
│   │   ├── settings/           # Organization + settings nav
│   │   ├── profile/            # Personal info, avatar, sessions, preferences, stats
│   │   ├── providers/          # Theme provider
│   │   └── ui/                  # Button, Card, Dialog, Select, Input, Label, Textarea
│   ├── lib/
│   │   ├── auth/               # Auth.js config, permissions matrix
│   │   ├── db/                  # Prisma client, tenant-scoped repositories
│   │   ├── email/ queue/ openai/ s3/ socket/ redis/ stripe/   # Scaffolded, unimplemented
│   │   └── utils.ts
│   ├── validations/             # Zod schemas (auth, project, team)
│   ├── types/                    # NextAuth type augmentation
│   └── proxy.ts                  # Middleware — auth + tenant guards
└── package.json
```

---

## Database

The schema (`prisma/schema.prisma`) models a multi-tenant SaaS with the following core entities:

| Model | Purpose |
|---|---|
| `Organization` | The tenant boundary — every business table references it via `tenantId` |
| `User` | Account record; supports both password and OAuth-based identities |
| `Membership` | Join table between `User` and `Organization`, carrying the user's `Role` for that org |
| `Invitation` | Pending/accepted/expired/revoked invites, scoped per tenant |
| `Project` | Top-level work container — status, priority, dates |
| `Task` | Kanban card — status, priority, position (for ordering), assignee, creator |
| `SubTask`, `ChecklistItem`, `TimeEntry`, `TaskLabel`, `Comment` | Task-level detail data, each tenant-isolated via the parent `Task` |
| `AuditLog` | Append-only record of created/updated/deleted/role-changed events |
| `UserPreferences` | Per-user theme and notification settings |
| `ActiveSession` | Custom multi-device session tracking (see Authentication) |
| `Notification`, `Subscription`, `File` | Modeled for planned features (notifications dispatch, billing, file storage) — schema exists ahead of the corresponding UI/API |

**Relationships:** `Organization → Membership → User` forms the tenancy/role backbone; `Project → Task → (SubTask, ChecklistItem, Comment, TimeEntry, TaskLabel)` forms the work-item hierarchy. Nearly every model carries an indexed `tenantId` for query performance under tenant-scoped filtering.

**Migrations:** managed via `prisma migrate dev` during development; the migrations directory tracks the schema's evolution, including the incremental additions made for subtasks/checklists/time-tracking and later for user preferences/sessions.

---

## Authentication

- **Provider setup:** Credentials (email/password) and Google OAuth, configured in `src/lib/auth/auth.config.ts`
- **Password hashing:** bcrypt, cost factor 12, with an explicit reuse check on password reset and account password changes
- **Session management:** JWT strategy with a custom `ActiveSession` table layered on top to support viewing and revoking individual device sessions — see [System Design](#system-design) for why this approach was used instead of Auth.js's database session strategy
- **Middleware protection:** `src/proxy.ts` runs on every non-static request, enforcing authentication on protected routes and redirecting authenticated users away from `/login` and `/register`
- **RBAC:** five roles (`SUPER_ADMIN`, `OWNER`, `MANAGER`, `DEVELOPER`, `VIEWER`) defined once in `src/lib/auth/permissions.ts` and consulted by both UI and API layers

---

## Security

Only measures actually implemented are listed:

- **Password hashing** — bcrypt (cost factor 12) for all stored passwords
- **Input validation** — every API route validates its body against a Zod schema before touching the database
- **Authentication enforcement** — `proxy.ts` middleware blocks unauthenticated access to all non-public routes before they reach a handler
- **Authorization enforcement** — `requirePermission()` is checked server-side on every mutating endpoint, independent of client-side UI gating
- **Tenant isolation** — repository-layer `tenantId` injection prevents cross-tenant data access even on otherwise-valid requests
- **SQL injection prevention** — all queries go through Prisma's parameterized query builder; no raw SQL string interpolation is used
- **Environment variable handling** — secrets (database URL, NextAuth secret, OAuth credentials) are loaded via `.env`, excluded from version control, and never logged

> **Not yet implemented:** explicit CSRF token handling beyond what Auth.js provides by default, and rate limiting on auth endpoints. Listed here for transparency rather than omitted.

---

## Performance Optimizations

- **Server Components by default** — all primary data-fetching pages (dashboard, projects, project detail, team, settings, analytics) render server-side, shipping no client JS for the initial data fetch
- **Client Components scoped narrowly** — interactivity (drag-and-drop, dialogs, live-filtering forms) is isolated to leaf components rather than promoting entire pages to client-rendered
- **Lazy loading** — the Kanban board is dynamically imported (`next/dynamic`, `ssr: false`) via `kanban-board-loader.tsx`, since drag-and-drop libraries are client-only and unnecessary in the initial server-rendered payload
- **Database query efficiency** — list endpoints (projects, tasks) use `Promise.all` to parallelize count and data queries, and indexed `tenantId`/`status`/`projectId` fields back the most common filter patterns
- **Debounced search** — project and task search inputs debounce at 300ms before triggering a fetch, avoiding a request per keystroke

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/De-Junior/teamflow.git
cd teamflow

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# then fill in the values — see Environment Variables below

# 4. Run database migrations
npx prisma migrate dev

# 5. Generate the Prisma client (also runs automatically on build)
npx prisma generate
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Pooled PostgreSQL connection string (Neon) |
| `DIRECT_URL` | ✅ | Direct (non-pooled) PostgreSQL connection string, used by Prisma migrations |
| `NEXTAUTH_SECRET` | ✅ | Secret used to sign Auth.js JWTs |
| `NEXTAUTH_URL` | ✅ | Base URL of the deployed app (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | Optional | Enables Google OAuth login if set |
| `GOOGLE_CLIENT_SECRET` | Optional | Paired with the above |
| `REDIS_URL` | Planned | Not yet consumed by the app — reserved for future real-time/queue features |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `AWS_S3_BUCKET` | Planned | File/avatar upload returns a graceful "not configured" response until these are set |
| `RESEND_API_KEY` / `EMAIL_FROM` | Planned | Invitation emails currently log to console instead of sending |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_*` | Planned | Billing not implemented |
| `OPENAI_API_KEY` | Planned | No AI features implemented yet |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Optional | Error monitoring — SDK installed, not configured |
| `NEXT_PUBLIC_APP_URL` | ✅ | Used to build absolute links (e.g. invitation URLs) |
| `NEXT_PUBLIC_APP_NAME` | Optional | Display name used in metadata |

> No secrets are included in this table or anywhere else in this repository.

---

## Running the Project

```bash
# Development (Turbopack)
npm run dev

# Production build (runs `prisma generate` first)
npm run build
npm run start

# Linting
npm run lint

# Database
npx prisma migrate dev --name <migration_name>   # create + apply a migration
npx prisma studio                                  # browse data visually
```

> No seed script is currently present in the project.

---

## Screenshots

```
docs/
├── login.png
├── dashboard.png
├── analytics.png
├── projects.png
├── tasks.png
└── settings.png
```

*(Add screenshots to a `docs/` folder and reference them here once captured.)*

---

## API Overview

All routes live under `src/app/api/` and follow the `{ success, data?, message? }` response convention.

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | — | Auth.js handler (sign in/out, callbacks) |
| `/api/auth/register`, `/api/register` | `POST` | Account registration |
| `/api/forgot-password`, `/api/reset-password` | `POST` | Password reset flow |
| `/api/projects` | `GET`, `POST` | List (search/filter/sort/paginate) and create projects |
| `/api/projects/[id]` | `GET`, `PATCH`, `DELETE` | Single project operations |
| `/api/projects/[id]/duplicate` | `POST` | Duplicate a project's metadata |
| `/api/tasks` | `POST` | Create a task |
| `/api/tasks/[id]` | `GET`, `PATCH`, `DELETE` | Single task operations |
| `/api/tasks/reorder` | `POST` | Persist Kanban position/status changes |
| `/api/tasks/[id]/comments`, `/subtasks`, `/checklist`, `/time`, `/labels`, `/activity` | various | Task sub-resources |
| `/api/members`, `/api/members/[id]` | `GET`, `PATCH`, `DELETE` | Membership and role management |
| `/api/invitations`, `/resend`, `/revoke` | `GET`, `POST` | Invitation lifecycle |
| `/api/users`, `/api/users/preferences`, `/api/users/avatar`, `/api/users/stats`, `/api/users/tasks`, `/api/users/activity` | various | Profile, preferences, statistics |
| `/api/users/sessions`, `/touch`, `/revoke-others`, `/[id]` | various | Multi-device session management |
| `/api/users/connected-accounts`, `/[provider]` | `GET`, `DELETE` | OAuth account linking management |
| `/api/organizations` | `PATCH` | Organization settings |
| `/api/webhooks/stripe`, `/api/notifications`, `/api/files` | — | Scaffolded, not implemented |

---

## Development Workflow

- **Branching:** feature-scoped branches off `main`, one logical feature or fix per branch
- **Commits:** small, descriptive commits aligned to a single change (schema migration, API route, UI component) rather than broad sweeping commits
- **Code organization:** strict separation between Server Components (data fetching), Client Components (interactivity), API route handlers (validation + authorization + repository calls), and the repository layer itself (tenant-scoped data access) — kept distinct on purpose to make the codebase easy to reason about as it grew

---

## Future Improvements

Realistic next steps, in rough priority order:

1. **Wire up file storage** — fill in AWS credentials and implement the actual S3 upload logic behind the already-built avatar UI
2. **Transactional email** — replace console-logged invitation links with real delivery via Resend
3. **Real-time collaboration** — replace 30-second polling with Socket.io-backed live updates for Kanban moves, comments, and presence
4. **Notification center** — build the API and UI on top of the existing `Notification` model
5. **Rate limiting** on authentication endpoints
6. **Billing** — complete the Stripe subscription flow against the existing `Subscription` model
7. **Automated testing** — no test suite currently exists; unit tests for the permission matrix and repository layer would be the highest-value starting point

---

## Contributing

This is currently a solo portfolio project, but contributions are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes with clear, scoped commits
4. Run `npm run lint` before opening a PR
5. Open a pull request describing the change and reasoning behind it

---

## License

MIT — see `LICENSE` for details.

---

## Author

**James Junior Hlungwane**

- LinkedIn: [linkedin.com/in/james-junior-hlungwane-4307aa1a0](https://www.linkedin.com/in/james-junior-hlungwane-4307aa1a0)
- Portfolio: [react-portfolio-black-sigma.vercel.app](https://react-portfolio-black-sigma.vercel.app/)
- GitHub: [github.com/De-Junior](https://github.com/De-Junior)

### Demo Login



| Field | Value |
|---|---|
| Email | `recruiter@teamflow-demo.com` |
| Password | `Demo1234!` |

---

## How I Would Present This Project in an Interview

**Architecture decisions:** I'd lead with the tenant-isolation strategy — rather than relying on developers to remember a `WHERE tenantId = ?` clause on every query, I pushed that requirement into a repository layer (`projectRepository`, `taskRepository`) so it's structurally enforced. I'd contrast this with the alternative (row-level security at the database layer) and explain why I chose the application-layer approach for this project's scope.

**Challenges:** the most interesting one was session management. Auth.js doesn't support database sessions alongside a Credentials provider — only JWT. Rather than switching auth strategy (which would have broken password login), I built a parallel `ActiveSession` table with a `sessionId` embedded in the JWT, checked and revocable independently of the JWT's own validity — and had to account for the fact that the JWT callback runs in both Node and Edge runtimes, where Prisma can only safely execute in the former.

**Interesting technical implementations:** the Kanban reorder logic is a good one to walk through — the initial implementation only persisted the *target* column's positions on a cross-column drag, silently corrupting the *source* column's order on the next page load. Catching and fixing that (so both columns are recomputed and saved on every drag) is a concrete example of the kind of bug that's easy to miss in a demo and exactly what production code review catches.

**Scalability:** the repository pattern and indexed `tenantId` fields are designed with the assumption that this could scale to many organizations sharing one database — the architecture doesn't require a schema-per-tenant or database-per-tenant approach to remain correct.

**Security:** role-based authorization is checked server-side on every mutation, not just hidden in the UI — I'd be ready to show a specific example, like the `task:delete` permission being checked in the API route independent of whether the delete button happens to be rendered.

**Lessons learned:** building this iteratively — reading existing code before writing new code, rather than regenerating whole files from scratch — caught several integration bugs (TypeScript prop mismatches between component layers, a missing `userRole` thread-through) that a single big-bang generation would likely have introduced silently.

---

## Project Highlights

This project demonstrates production-oriented engineering decisions rather than a tutorial-style CRUD build: structural multi-tenant data isolation, a centralized and dual-enforced (UI + API) authorization model, a session-management solution engineered around a real library constraint rather than worked around superficially, and a Kanban implementation with a documented, fixed real-world ordering bug rather than a naive happy-path drag-and-drop demo. Equally important is what's *not* claimed: every unfinished integration (file storage, email, real-time, billing, AI) is explicitly marked as scaffolded-but-not-implemented rather than glossed over — a distinction that matters in a technical interview setting.
