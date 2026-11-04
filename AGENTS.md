# OLX Marketplace Monorepo — Engineering & Agent Guidelines

This document provides architectural standards, directory mappings, coding conventions, and operational workflows for AI coding agents and human engineers working on the OLX Marketplace codebase.

---

## 1. Monorepo Architecture Overview

The repository is organized as a **Turborepo** monorepo using **pnpm** workspaces:

```
olx/
├── apps/
│   ├── server/       # Fastify backend API (Port 5000)
│   ├── admin/        # Staff management dashboard (React + Vite, Port 5174)
│   ├── client/       # Public buyer/seller web client (React + Vite, Port 5173)
│   └── workers/      # BullMQ background job workers & queues (Port 8081)
│
├── packages/
│   ├── database/     # Prisma ORM schema, migrations, seeders (@olx/database)
│   └── shared/       # Shared TypeScript types, RBAC matrices, constants (@olx/shared)
│
├── package.json      # Monorepo root scripts & Turborepo config
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 2. Applications & Packages Directory Guide

### A. `apps/server` (`@olx/server`)
- **Runtime & Framework**: Node.js + Fastify v4 + TypeScript.
- **Port**: `5000` (API base: `/api/v1`).
- **Core Architecture**:
  - `src/app.ts`: Fastify application setup, global plugins, cookie parsing, CORS, static uploads.
  - `src/server.ts`: Entrypoint and graceful shutdown.
  - `src/plugins/`: Fastify plugins (`auth.plugin.ts`, `cors.plugin.ts`, `rate-limit.plugin.ts`, `error-handler.plugin.ts`, etc.).
  - `src/config/`: Runtime environment (`env.ts`), Prisma client (`prisma.ts`), Redis connection (`redis.ts`).
  - `src/modules/<domain>/`: Domain-driven module structure. Each domain module consists of:
    - `<domain>.routes.ts`: Fastify route declarations and authorization guards.
    - `<domain>.controller.ts`: Request parsing, schema validation, HTTP responses.
    - `<domain>.service.ts`: Core business logic and database orchestration.
    - `<domain>.repository.ts`: Database query encapsulation (Prisma).
    - `<domain>.schema.ts`: Zod validation schemas for input/output.
    - `<domain>.types.ts`: Domain-specific TypeScript types.
- **Active Domains**: `auth`, `admin`, `listings`, `categories`, `locations`, `users`, `chat`, `reports`, `payments`, `uploads`, `notifications`.

### B. `apps/admin` (`@olx/admin`)
- **Runtime & Framework**: React 18 + Vite + TypeScript.
- **Port**: `5174` (Proxies `/api` to `http://localhost:5000`).
- **UI Stack**: Tailwind CSS, Shadcn UI (`src/components/ui/*`), Lucide React icons, Recharts.
- **State Management**:
  - **Server State**: TanStack Query v5 (`@tanstack/react-query`).
  - **Client State**: Zustand (`src/stores/auth.store.ts`) for session profile and active role simulation.
- **Directory Structure**:
  - `src/app/`: App router (`router.tsx` with `ProtectedRoute` & `RoleGuard`), providers (`providers.tsx`), query client setup (`query-client.ts`), theme provider.
  - `src/components/layout/`: Shell layout (`DashboardLayout.tsx`), header (`AdminHeader.tsx` with role switcher), sidebar (`AppSidebar.tsx`, `NavMain.tsx`, `NavUser.tsx`, `TeamSwitcher.tsx`).
  - `src/features/<domain>/`: Modular feature folders. Each feature strictly follows:
    - `<feature>Page.tsx` or role views (e.g., `SuperAdminDashboard.tsx`, `AdminDashboard.tsx`).
    - `service/<feature>.service.ts`: Pure async API calls via `apiClient`.
    - `hook/use<Feature>Query.ts`: Data fetching hooks using `useQuery`.
    - `hook/use<Feature>Mutation.ts`: Modification hooks using `useMutation` with toast notifications and cache invalidation.
  - `src/lib/`:
    - `api-client.ts`: Axios instance configured with `withCredentials: true`, automated silent refresh interceptor on 401, and redirect loop protection.
    - `permissions.ts`: Role metadata and navigation routing per staff role.

### C. `apps/client` (`@olx/client`)
- **Runtime & Framework**: React + Vite + TypeScript (Port `5173`).
- **Purpose**: Public marketplace user web portal for browsing classifieds, posting ads, real-time chat, and payments.

### D. `apps/workers` (`@olx/workers`)
- **Runtime**: Node.js + BullMQ + Redis.
- **Purpose**: Background tasks (OTP email/SMS dispatch, image resizing, expired ad archiving, push notifications).

### E. `packages/database` (`@olx/database`)
- **ORM**: Prisma Client (`prisma/schema.prisma`).
- **Database**: PostgreSQL 16 (Port `5433` via Docker / `5432` local).
- **Key Seeds**:
  - `prisma/seed.ts`: Taxonomy, Indian cities, and categories.
  - `prisma/seed_all_roles.ts`: All 7 staff roles with default credentials (`rahul@123`).

### F. `packages/shared` (`@olx/shared`)
- **Purpose**: Cross-boundary contracts, RBAC matrices (`Permissions`, `ROLE_PERMISSIONS`, `hasPermission`), capability resolvers, hash utilities.

---

## 3. Modular Feature Architecture Standard

When building or modifying features in `apps/admin` or `apps/server`, maintain strict separation of concerns:

```
features/<feature>/
├── service/
│   └── <feature>.service.ts   # Axios API calls, request/response interfaces
├── hook/
│   ├── use<Feature>Query.ts    # React Query hooks (useQuery) with query keys
│   └── use<Feature>Mutation.ts # React Query mutations (useMutation) with toast & cache invalidation
└── <Feature>Page.tsx          # View components rendering data from hooks
```

### Golden Rules for Feature Implementation:
1. **Never combine services and hooks into a single file**: Services are framework-agnostic async API functions; hooks consume services inside TanStack Query.
2. **Always invalidate related query keys in mutations**:
   ```ts
   onSuccess: () => {
     queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
   }
   ```
3. **Do not put direct axios calls inside React components**: Components must always consume hooks (`use...Query` or `use...Mutation`).

---

## 4. Authentication & Multi-Role RBAC Model

### 1. HTTP-Only Cookie Authentication
- Sessions are powered by secure HTTP-only cookies (`access_token` and `refresh_token`).
- Tokens are **never stored in `localStorage`** to prevent XSS token theft.
- `localStorage` is used solely by Zustand to persist non-sensitive user profile data (`olx-admin-user`) for immediate UI rehydration.
- On 401 response: `api-client.ts` attempts silent refresh (`POST /api/v1/auth/refresh`). If refresh fails, it cleans `localStorage.removeItem('olx-admin-user')` before redirecting to `/login` to prevent infinite reload loops.

### 2. Supported Staff Roles & Hierarchy
The platform supports 7 distinct staff roles (`UserRole`):

| Role | Scope & Permissions | Key Dashboard Features |
| :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Wildcard access (`*`), full control | Can view & simulate all 7 dashboards, staff invitations, system audit trail |
| **`ADMIN`** | Platform operations, users, ads | User suspension, listing deletion, category management |
| **`MODERATOR`** | Trust & safety, listing verification | Review ad approvals/rejections, investigate safety reports |
| **`CUSTOMER_SUPPORT`** | Customer helpdesk, inquiry tickets | Support ticket triage, complaint resolutions |
| **`FINANCE_ADMIN`** | Financial ledger, revenue, escrow | Boost/promotion orders, seller payouts, refunds |
| **`CONTENT_MANAGER`** | Taxonomy & promotional content | Category trees, marketing banners, announcements |
| **`ANALYST`** | BI metrics, conversion funnels | Read-only analytics, category conversion ratios, trend reports |

### 3. Server-Side Guard Enforcement
Every protected route in `apps/server` must enforce:
1. `fastify.authenticate`: Verifies cookie/JWT, queries database for active status (`user.status === 'ACTIVE'`).
2. `authorizeRoles(...)` or `requirePermission(...)`: Validates that the caller holds the required authority.
3. User status check: Inactive or suspended accounts (`status !== 'ACTIVE'`) must be rejected with `401 USER_INACTIVE` or `403 ACCOUNT_SUSPENDED`.

---

## 5. Coding Standards & Principles

Follow the **Gemini Code Rules**:

1. **Simplicity First**:
   - Solve the exact problem with the simplest correct solution.
   - Do not over-engineer or add speculative layers (e.g. no unnecessary factories, repositories, or wrappers).
   - Prefer clear code over clever code.

2. **Clean Organization**:
   - Keep files reasonably small and focused.
   - Group related code together: imports at top, types/interfaces next, main logic easy to scan.
   - Helper functions should remain small and close to where they are used.

3. **Comments**:
   - Explain **why**, not obvious **what**.
   - Use single-line or 2-3 line for better understand or overview about that feature  `//` comments /**/.
   - Do not use decorative separator or banner comments (e.g. `// ===== USER SERVICE =====`).

4. **Resource Management**:
   - Clean up resources: clear timers, cancel requests, unsubscribe when unmounting.
   - Never create infinite background pollers when reactive updates or one-shot fetches suffice.

5. **Error Handling**:
   - Never hide or swallow errors.
   - Provide human-readable, actionable error messages in UI toasts.
   - Use centralized `AppError` on the backend with appropriate HTTP status codes.

---

## 6. Monorepo Commands Runbook

Always run commands from the monorepo root (`olx/`):

### Development
```bash
# Run all apps concurrently via Turbo
pnpm dev

# Run individual apps
pnpm dev:server    # Backend API on port 5000
pnpm dev:admin     # Admin dashboard on port 5174
pnpm dev:client    # Client web app on port 5173
pnpm dev:workers   # Background workers on port 8081
```

### Database & Seeding
```bash
# Generate Prisma Client
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Open Prisma Studio GUI
pnpm db:studio

# Seed all 7 staff roles with default credentials (rahul@123)
pnpm db:seed:roles
```

### Build & Typecheck
```bash
# Build all workspaces
pnpm build

# Build specific workspace
pnpm build:admin
pnpm build:server
```

### Docker Infrastructure
```bash
# Start PostgreSQL & Redis services in background
pnpm docker:db

# Stop all Docker containers
pnpm docker:down
```

---

## 7. AI Agent Checklist Before Completing Tasks

Before concluding any work, verify against this checklist:
- [ ] **Exact Problem Solved**: The solution directly addresses the user's request without adding unrequested features.
- [ ] **No Infinite Loops**: All auth redirects, queries, and mutations have terminal states and handle failure gracefully.
- [ ] **Type Safety & Build**: Run `pnpm build:admin` or `pnpm build:server` to verify zero TypeScript errors.
- [ ] **Clean Git Diff**: Ensure no temporary debug logs (`console.log`), unused scratch files, or unrelated file modifications remain.
- [ ] **Cookie & Token Safety**: Never store authentication tokens in `localStorage`.
