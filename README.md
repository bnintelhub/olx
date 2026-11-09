# BharatMarket (OLX Marketplace) — Full-Stack Monorepo

> Production-grade classifieds marketplace built with **Fastify**, **PostgreSQL**, **Redis**, **BullMQ**, **MinIO (S3)**, **Socket.IO**, and **React (Vite)** inside a high-performance **pnpm + Turborepo** monorepo.

---

## Table of Contents

- [Monorepo Architecture](#monorepo-architecture)
  - [Workspace Structure](#workspace-structure)
  - [Available Monorepo Commands](#available-monorepo-commands)
- [System Architecture & Core Workflows](#system-architecture--core-workflows)
  - [1. Media Upload & Ad Creation Workflow](#1-media-upload--ad-creation-workflow)
  - [2. User Registration & BullMQ OTP Queue](#2-user-registration--bullmq-otp-queue)
  - [3. Password Recovery & Cooldown Flow](#3-password-recovery--cooldown-flow)
  - [4. Role-Based Access Control (RBAC) & Capabilities](#4-role-based-access-control-rbac--capabilities)
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Running with Docker Compose](#running-with-docker-compose)
  - [Running in Local Development Mode](#running-in-local-development-mode)
- [License](#license)

---

## Monorepo Architecture

The repository is organized as a unified, high-performance **pnpm + Turborepo monorepo**:

### Workspace Structure

```
olx/
├── apps/
│   ├── admin/               # React + Tailwind + TanStack Admin Operations Portal (@olx/admin)
│   ├── client/              # React 18 + Vite + Tailwind Classifieds Marketplace Web App (@olx/client)
│   ├── server/              # Fastify v4 + TypeScript REST API & Clustered Socket.IO (@olx/server)
│   └── workers/             # BullMQ 5.x Background Job Workers (Sharp Media & OTP) (@olx/workers)
├── packages/
│   ├── database/            # Prisma 5.22 ORM, PostgreSQL schema, migrations, seed (@olx/database)
│   └── shared/              # Unified RBAC, capabilities, errors, audit & crypto utils (@olx/shared)
├── infrastructure/          # Dockerfiles & deployment configurations
├── docker-compose.yml       # PostgreSQL 16, Redis 7, MinIO, Server, Workers & Client
├── pnpm-workspace.yaml      # Monorepo packages mapping
├── turbo.json               # Turbo pipeline definitions & topological task caching
└── package.json             # Root monorepo orchestration scripts
```

### Available Monorepo Commands

All commands can be executed directly from the monorepo root:

| Command | Action |
|:---|:---|
| `pnpm dev` | Starts all applications (`admin`, `client`, `server`, `workers`) concurrently via Turbo |
| `pnpm dev:client` | Starts the buyer/seller web application on port `5173` |
| `pnpm dev:admin` | Starts the Admin Operations Portal on port `5174` |
| `pnpm dev:server` | Starts the Fastify backend API in watch mode on port `5000` |
| `pnpm dev:workers` | Starts BullMQ background workers in watch mode |
| `pnpm build` | Compiles all packages and applications with topological ordering |
| `pnpm test` | Runs the full test suite (unit, integration, and e2e tests via Vitest) |
| `pnpm db:generate` | Generates the Prisma Client in `@olx/database` |
| `pnpm db:push` | Synchronizes Prisma schema changes directly to PostgreSQL |
| `pnpm db:studio` | Launches Prisma Studio visual database inspector on port `5555` |
| `pnpm db:seed` | Seeds database with categories, locations, sample ads, and credentials |
| `pnpm docker:up` | Boots the entire application stack via Docker Compose |
| `pnpm docker:down` | Gracefully stops all Docker containers |
| `pnpm docker:build` | Builds production Docker images for server, workers, and clients |

---

## System Architecture & Core Workflows

> 🔗 **Detailed Workflow Documentation**:
> - [Production VPS Deployment Strategy](docs/DEPLOYMENT_STRATEGY.md)
> - [Ad Creation & Moderation Flow](docs/AD_CREATION_AND_MODERATION_FLOW.md)
> - [Authentication & OTP Workflow](docs/AUTH_WORKFLOW.md)
> - [RBAC & Account Capabilities Spec](docs/RBAC_WORKFLOW.md)
> - [Universal Media & Smart Crop Pipeline](docs/media.md)

### 1. Media Upload & Ad Creation Workflow

Media upload and ad post creation are decoupled into two asynchronous phases to ensure instantaneous UI response times and atomic database persistence:

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Client / Browser)
    participant Server as Fastify API Server
    participant Redis as Redis (BullMQ Queue)
    participant Worker as Background Worker (Sharp)
    participant S3 as MinIO / S3 Storage
    participant DB as PostgreSQL (Prisma)

    %% PHASE 1: IMAGE UPLOAD
    rect rgb(240, 248, 255)
    Note over User, S3: Phase 1: Image Upload & Background Optimization
    User->>Server: 1. POST /api/v1/media/images?resource=ads (multipart/form-data)
    Server->>Server: Magic bytes, MIME type & size validate
    Server->>DB: Media record create (status: PENDING, scope: UNATTACHED)
    Server->>Redis: Job push to 'media-process' queue
    Server-->>User: 201 Created (mediaId & temp preview)

    Redis->>Worker: Consume job (mediaId)
    Worker->>Worker: Sharp engine: WebP variants (thumb, medium, card, large) + BlurHash
    Worker->>S3: Upload WebP variants (ads/drafts/images/{id}/)
    Worker->>DB: Update Media (status: READY, variants: {...})
    end

    %% PHASE 2: POST CREATION
    rect rgb(245, 255, 245)
    Note over User, DB: Phase 2: Ad Creation & Atomic Linking
    User->>Server: 2. POST /api/v1/ads { title, price, categoryId, images: [{ mediaId }] }
    Server->>Server: Fraud detection & Category dynamic attributes check
    Server->>DB: Validate mediaId ownership & status (status === 'READY')
    
    critical Prisma $transaction (Atomic)
        Server->>DB: Insert into "ads" table (status: ACTIVE / PENDING_REVIEW)
        Server->>DB: Insert into "ad_images" table (variants URLs, isCover, sortOrder)
        Server->>DB: Update "media" table (isAttached: true, attachedToId: ad.id, scope: AD_IMAGE)
        Server->>DB: Insert "ad_attribute_values"
    end

    Server->>Redis: Invalidate cache (feed, category counts)
    Server-->>User: 201 Created { success: true, data: { adId, slug } }
    end
```

- **Phase 1 (Image Upload & Optimization)**: The client streams multipart images to Fastify. The server validates image magic bytes and records an unattached `media` row before immediately enqueuing a job in BullMQ. Dedicated workers process the images with Sharp, generate WebP variants (`thumbnail`, `medium`, `card`, `large`) and BlurHash strings, and persist them to MinIO / S3.
- **Phase 2 (Ad Post Creation)**: When the user submits the listing form, Fastify validates required category specifications and runs anti-fraud heuristics. In a single atomic Prisma transaction (`$transaction`), the `ad` record is inserted, image variants are linked into `ad_images`, and the referenced `media` records are marked as permanently attached (`isAttached = true`).

---

### 2. User Registration & BullMQ OTP Queue

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client (Web / Mobile)
    participant Fastify as Fastify API (/api/v1/auth)
    participant DB as PostgreSQL (Prisma ORM)
    participant Redis as Redis 7.0
    participant BullMQ as BullMQ (otp-dispatch)
    participant Worker as BullMQ Background Worker
    participant SMS as SMS / Email Gateway

    Client->>Fastify: POST /register { phoneNumber, password, name }
    Fastify->>DB: Verify uniqueness & hash password (bcrypt)
    Fastify->>DB: Store OtpSession with SHA-256 OTP Hash
    Fastify->>BullMQ: Enqueue "otp-dispatch" job
    Fastify-->>Client: 201 Created { sessionId, expiresInSeconds: 300 }

    Note over BullMQ,Worker: Asynchronous Background Processing
    Worker->>BullMQ: Pop "otp-dispatch" job
    Worker->>SMS: Dispatch 6-digit verification OTP
    SMS-->>Client: Receive OTP code

    Client->>Fastify: POST /verify-otp { sessionId, code }
    Fastify->>DB: Validate SHA-256 hash & check attempt limit (<= 3)
    Fastify->>DB: Mark user ACTIVE & issue JWT tokens
    Fastify-->>Client: 200 OK { user, tokens: { accessToken, refreshToken } }
```

---

### 3. Password Recovery & Cooldown Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client (Web / Mobile)
    participant Fastify as Fastify API
    participant Redis as Redis (Cooldown TTL)
    participant DB as PostgreSQL
    participant BullMQ as BullMQ Worker

    Client->>Fastify: POST /forgot-password { identifier }
    Fastify->>Redis: Check cooldown key "otp_cooldown:<identifier>"
    alt Within 45-Second Cooldown
        Fastify-->>Client: 429 Too Many Requests (Rate limited)
    else Cooldown Cleared
        Fastify->>DB: Create OtpSession (PASSWORD_RESET, SHA-256)
        Fastify->>Redis: Set cooldown TTL (45s)
        Fastify->>BullMQ: Enqueue background dispatch
        Fastify-->>Client: 200 OK { sessionId, expiresInSeconds: 300 }
        BullMQ->>Client: Send Verification Code
    end

    Client->>Fastify: POST /reset-password { sessionId, code, newPassword }
    Fastify->>DB: Validate OTP hash & update password hash
    Fastify->>Redis: Invalidate cached user session
    Fastify-->>Client: 200 OK { message: "Password reset successful" }
```

---

### 4. Role-Based Access Control (RBAC) & Capabilities

Access control decouples administrative staff permissions from customer marketplace capabilities:

```mermaid
flowchart TD
    Req(["HTTP Request to Fastify API"]) --> Authenticate{"fastify.authenticate<br/>Valid JWT Token?"}
    Authenticate -->|"No"| Deny401["401 Unauthorized"]
    Authenticate -->|"Yes"| LoadUser["Extract user role, permissions<br/>and account capabilities"]
    
    LoadUser --> CheckActive{"Account status<br/>ACTIVE?"}
    CheckActive -->|"No"| DenyInactive["401 User Inactive / Suspended"]
    CheckActive -->|"Yes"| GuardType{"Route Guard Type"}
    
    GuardType -->|"requirePermission(P)"| CheckPerm{"user.role == SUPER_ADMIN<br/>OR has Permission P?"}
    CheckPerm -->|"Yes"| PassPerm["Allowed - Execute Controller"]
    CheckPerm -->|"No"| Deny403P["403 Forbidden<br/>FORBIDDEN_PERMISSION"]
    
    GuardType -->|"requireCapability(C)"| CheckCap{"user holds Capability C<br/>(e.g. can_sell)?"}
    CheckCap -->|"Yes"| PassCap["Allowed - Execute Controller"]
    CheckCap -->|"No"| Deny403C["403 Forbidden<br/>FORBIDDEN_CAPABILITY"]
```

#### Admin Panel Roles (Separation of Duties)
- **`SUPER_ADMIN`**: Full wildcard (`*`) access across all modules, platform settings, and audit logs.
- **`ADMIN`**: User moderation, category taxonomy, listing approvals, general management.
- **`MODERATOR`**: Investigates user reports, ad moderation, review queues.
- **`CUSTOMER_SUPPORT`**: Support tickets, dispute resolution, read-only customer records.
- **`FINANCE_ADMIN`**: Payment transactions, invoices, monetization plans, revenue analytics.
- **`CONTENT_MANAGER`**: Banners, promotional campaigns, category attributes.

#### Marketplace Account Capabilities
- **`can_buy`**: Browse listings, initiate real-time chats, negotiate offers, submit reviews.
- **`can_sell`**: Create, edit, feature, and manage classified listings.
- **`is_dealer`**: Bulk listing management, verified dealer badge, showroom page.

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Architecture** | pnpm Workspaces + Turborepo monorepo |
| **API Server** | Fastify v4, TypeScript, Zod Schema Validation |
| **Database & ORM** | PostgreSQL 16, Prisma 5.22 ORM |
| **Caching & Queues** | Redis 7, BullMQ 5.x |
| **Object Storage** | MinIO (Local S3-compatible) / AWS S3 |
| **Image Processing** | Sharp (WebP variants, BlurHash, metadata extraction) |
| **Real-Time Engine** | Socket.IO v4 clustered via `@socket.io/redis-adapter` |
| **Frontend Web** | React 18, Vite, Tailwind CSS, Lucide Icons, GSAP animations |
| **Admin Portal** | React 18, Tailwind CSS, TanStack Query & Table |
| **Testing** | Vitest, Supertest, Fastify Inject |

---

## Key Features

- **Decoupled Media Pipeline**: Non-blocking image uploads with automatic multi-resolution WebP optimization (`large`, `medium`, `card`, `thumbnail`) and blurhash generation.
- **Atomic Deletion & S3 Cleanup**: Complete physical deletion of image variants and S3 directories upon listing deletion.
- **Real-Time Clustered Chat**: Instant buyer-seller messaging with Redis pub/sub adapter support for multi-instance horizontal scaling.
- **Dynamic Category Attributes**: Category-specific specifications (e.g. mileage/year for Cars, RAM/storage for Phones) with dynamic schema validation.
- **Anti-Fraud & Moderation**: Automated scam detection heuristics flag suspicious listings for manual moderator inspection.
- **Monetization & Credits**: Featured ads, urgent tags, and category listing limits with paid credits support.

---

## Getting Started

### Prerequisites

- **Node.js**: `v20+` or `v22+`
- **pnpm**: `v10+` (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker & Docker Compose**: For PostgreSQL, Redis, and MinIO storage

---

### Environment Setup

Create `.env` inside `apps/server`:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/olx_marketplace?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="bharatmarket_super_secure_jwt_access_secret_key_2026"
JWT_REFRESH_SECRET="bharatmarket_super_secure_jwt_refresh_secret_key_2026"
SMS_PROVIDER="MOCK"
MOCK_OTP_CODE="123456"
CLIENT_URL="http://localhost:5173"
S3_ENDPOINT="http://localhost:9000"
S3_PUBLIC_URL="http://localhost:9000/olx-media"
S3_ACCESS_KEY="admin_olx"
S3_SECRET_KEY="SuperSecurePassword123"
S3_BUCKET="olx-media"
```

---

### Running with Docker Compose

To boot all infrastructure services (PostgreSQL, Redis, MinIO, API server, Workers, and Client):

```bash
docker compose up -d
```

Service endpoints:
- **Client App**: `http://localhost:5173`
- **Admin Portal**: `http://localhost:5174`
- **API Server**: `http://localhost:5000` (Swagger docs: `/docs`, Health: `/api/v1/health`)
- **MinIO Console**: `http://localhost:9001` (User: `admin_olx`, Password: `SuperSecurePassword123`)

---

### Running in Local Development Mode

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start databases & storage:**
   ```bash
   pnpm docker:db
   ```

3. **Initialize database schema & seed data:**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

4. **Launch all services in development mode:**
   ```bash
   pnpm dev
   ```

---

## License

This project is licensed under the [MIT License](LICENSE).
