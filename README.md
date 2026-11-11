# BharatMarket (OLX Orbit) — Full-Stack Monorepo

> Production-grade peer-to-peer classifieds marketplace built with **Fastify 5**, **PostgreSQL 16**, **Redis 7**, **BullMQ**, **Sharp WebP Media Service**, **Socket.IO (Redis Clustered)**, and **React 18 (Vite + Tailwind)** inside a high-performance **pnpm** monorepo.

---

## Table of Contents

- [Monorepo Architecture](#monorepo-architecture)
  - [Workspace Structure](#workspace-structure)
  - [Available Monorepo Commands](#available-monorepo-commands)
- [System Architecture & Core Workflows](#system-architecture--core-workflows)
  - [High-Level System Architecture](#high-level-system-architecture)
  - [Nginx Unified Gateway & Reverse Proxy Flow](#nginx-unified-gateway--reverse-proxy-flow)
  - [1. Media Upload & Optimization Pipeline](#1-media-upload--optimization-pipeline)
  - [2. Real-Time Chat & Push Notifications](#2-real-time-chat--push-notifications)
  - [3. User Registration & BullMQ OTP Queue](#3-user-registration--bullmq-otp-queue)
  - [4. Password Recovery & Cooldown Flow](#4-password-recovery--cooldown-flow)
  - [5. Role-Based Access Control (RBAC) & Capabilities](#5-role-based-access-control-rbac--capabilities)
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Environment Variables & Deployment Guide](#environment-variables--deployment-guide)
  - [Where to Place `.env` Files](#where-to-place-env-files)
  - [Environment Variables Reference](#environment-variables-reference)
  - [Production Deployment Security Checklist](#production-deployment-security-checklist)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Running with Docker Compose](#running-with-docker-compose)
  - [Running in Native Local Development Mode](#running-in-native-local-development-mode)
- [License](#license)

---

## Monorepo Architecture

The repository is organized as a unified, high-performance **pnpm monorepo**:

### Workspace Structure

```text
olx/
├── apps/
│   ├── client/              # React 18 + Vite + Tailwind Customer PWA (@olx/client)
│   ├── admin/               # React 18 + Tailwind Moderation & Ops Portal (@olx/admin)
│   ├── server/              # Fastify 5 REST API & Clustered Socket.IO Server (@olx/server)
│   ├── media-service/       # Dedicated Media Upload & Sharp Optimization Service (@olx/media-service)
│   └── workers/             # BullMQ Background Job Workers (Image Processing & Push) (@olx/workers)
├── packages/
│   ├── database/            # Prisma 5.22 ORM, PostgreSQL schema, migrations & seeders (@olx/database)
│   └── shared/              # Shared types, storage adapters, validation schemas (@olx/shared)
├── infrastructure/
│   ├── docker/dev/          # Development container configurations (Dockerfiles)
│   └── nginx/               # Nginx reverse proxy routing configurations
├── docs/                    # In-depth architectural & deployment documentation
├── docker-compose.dev.yml   # Development Docker Compose stack
├── pnpm-workspace.yaml      # Monorepo packages mapping
└── package.json             # Root monorepo orchestration scripts
```

### Available Monorepo Commands

All commands can be executed directly from the monorepo root:

| Command | Action |
|:---|:---|
| `pnpm dev` | Starts all applications (`client`, `admin`, `server`, `media-service`, `workers`) concurrently |
| `pnpm --filter @olx/client dev` | Starts the customer web application on port `5173` |
| `pnpm --filter @olx/admin dev` | Starts the Admin Operations Portal on port `5174` |
| `pnpm --filter @olx/server dev` | Starts the Fastify API backend in watch mode on port `5000` |
| `pnpm --filter @olx/media-service dev` | Starts the Media Microservice on port `5005` |
| `pnpm --filter @olx/workers dev` | Starts BullMQ background workers in watch mode |
| `pnpm build` | Compiles all packages and applications in topological dependency order |
| `pnpm db:generate` | Generates the Prisma Client in `@olx/database` |
| `pnpm db:push` | Synchronizes Prisma schema changes directly to PostgreSQL |
| `pnpm db:seed` | Seeds database with categories, locations, sample ads, and credentials |
| `pnpm db:studio` | Launches Prisma Studio visual database inspector on port `5555` |

---

## System Architecture & Core Workflows

> 🔗 **Detailed Workflow Documentation**:
> - [Production Deployment Strategy](docs/DEPLOYMENT_STRATEGY.md)
> - [Universal Media & Storage Pipeline](docs/media.md)
> - [Ad Creation & Moderation Flow](docs/AD_CREATION_AND_MODERATION_FLOW.md)
> - [Authentication & OTP Workflow](docs/AUTH_WORKFLOW.md)
> - [RBAC & Account Capabilities Spec](docs/RBAC_WORKFLOW.md)

### High-Level System Architecture

A clean, end-to-end view of the platform components, data stores, and communication pathways:

```mermaid
flowchart TD
    subgraph Clients["Clients & Interfaces"]
        ClientWeb["Customer Web App<br/>(React 18 + Vite + Tailwind PWA)"]
        AdminWeb["Admin Operations Portal<br/>(React 18 + Vite + TanStack)"]
    end

    subgraph Edge["Reverse Proxy & Gateway"]
        NginxGateway["Nginx Gateway (:80 / :443)<br/>SSL Termination • Rate Limiting • Routing"]
    end

    subgraph Services["Application Services"]
        ClientContainer["Client Container (:80)<br/>Static SPA Server"]
        AdminContainer["Admin Container (:80)<br/>Static SPA Server"]
        APIServer["Fastify API Server (:5000)<br/>REST Endpoints • Clustered Socket.IO"]
        MediaService["Media Microservice (:5005)<br/>Uploads • MIME Validation"]
        WorkerService["BullMQ Worker Service<br/>Sharp WebP Processing • Push Queue"]
    end

    subgraph StorageTier["Data & Cache Persistence"]
        PostgresDB[("PostgreSQL 16 Database<br/>Prisma ORM • Relational Data")]
        RedisStore[("Redis 7 Cache & Session<br/>BullMQ Queues • Socket.IO Adapter")]
        MediaVolume[("Persistent Media Volume<br/>/data/olx-media")]
    end

    Clients -->|"HTTP(S) & WebSocket"| NginxGateway

    NginxGateway -->|"Path: /"| ClientContainer
    NginxGateway -->|"Path: /admin/"| AdminContainer
    NginxGateway -->|"Path: /api/ & /socket.io"| APIServer
    NginxGateway -->|"Path: /media/ (Cached Static)"| MediaVolume
    NginxGateway -->|"Path: /api/v1/media/"| MediaService

    APIServer -->|"Read & Write Queries"| PostgresDB
    APIServer -->|"Cache, Rate Limits & Pub/Sub"| RedisStore
    APIServer -->|"Enqueue Tasks"| RedisStore

    MediaService -->|"Save Raw Uploads"| MediaVolume
    MediaService -->|"Enqueue Image Jobs"| RedisStore
    MediaService -->|"Media Metadata"| PostgresDB

    WorkerService -->|"Consume Jobs"| RedisStore
    WorkerService -->|"Generate WebP Variants"| MediaVolume
    WorkerService -->|"Update Status"| PostgresDB
```

---

### Nginx Unified Gateway & Reverse Proxy Flow

How incoming HTTP and WebSocket requests are inspected, rewritten, and routed across container services:

```mermaid
flowchart LR
    subgraph Incoming["Incoming Traffic"]
        Request["Browser / Mobile Client Request<br/>(Port 80 / Port 443)"]
    end

    subgraph NginxProxy["Nginx Gateway Router"]
        Match{"Route Prefix Match"}
    end

    subgraph Destinations["Target Services"]
        ClientSPA["Client App (client:80)<br/>Path: /<br/>SPA Fallback (try_files /index.html)"]
        AdminSPA["Admin Portal (admin:80)<br/>Path: /admin/*<br/>Rewrite: /admin/(.*) to /$1"]
        FastifyAPI["Backend Server (server:5000)<br/>Path: /api/*<br/>REST Endpoints (/api/v1/*)"]
        SocketIO["Fastify Realtime (server:5000)<br/>Path: /socket.io*<br/>Upgrade: WebSocket"]
        MediaStatic["Disk Storage (/data/olx-media)<br/>Path: /media/*<br/>Direct Static Delivery (30d Cache)"]
        MediaFallback["Media Service (media-service:5005)<br/>On-Demand Fallback for Missing Files"]
        MediaUploadAPI["Media Service (media-service:5005)<br/>Path: /api/v1/media/*<br/>Multipart Upload Engine"]
        HealthCheck["Backend Server (server:5000)<br/>Path: /health<br/>Liveness Probe (/api/v1/health)"]
    end

    Request --> Match

    Match -->|"Path: /"| ClientSPA
    Match -->|"Path: /admin or /admin/*"| AdminSPA
    Match -->|"Path: /api/*"| FastifyAPI
    Match -->|"Path: /socket.io*"| SocketIO
    Match -->|"Path: /media/* (Exists on Disk)"| MediaStatic
    MediaStatic -.->|"Cache Miss / Missing"| MediaFallback
    Match -->|"Path: /api/v1/media/*"| MediaUploadAPI
    Match -->|"Path: /health"| HealthCheck
```

---

### 1. Media Upload & Optimization Pipeline

Image uploads are decoupled from ad creation to ensure instantaneous UI response times and resilient image compression:

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Client / Admin)
    participant MediaSrv as Media Microservice (:5005)
    participant Redis as Redis (BullMQ Queue)
    participant Worker as Background Worker (Sharp)
    participant Storage as Local Storage (/data/olx-media)
    participant DB as PostgreSQL (Prisma)
    participant API as Fastify API (:5000)

    %% PHASE 1: ASYNC UPLOAD & OPTIMIZATION
    rect rgb(240, 248, 255)
    Note over User, Storage: Phase 1: Image Upload & Background WebP Generation
    User->>MediaSrv: 1. POST /media/images?resource=ads (multipart/form-data)
    MediaSrv->>MediaSrv: Magic bytes check, MIME & size validation
    MediaSrv->>DB: Create Media record (status: PENDING)
    MediaSrv->>Storage: Save original upload
    MediaSrv->>Redis: Enqueue job to 'media-process' queue
    MediaSrv-->>User: 201 Created (mediaId & previewUrl)

    Redis->>Worker: Consume job (mediaId)
    Worker->>Worker: Sharp processing: WebP variants (thumb, medium, card, large)
    Worker->>Storage: Persist generated WebP files
    Worker->>DB: Update Media (status: READY, variants: {...})
    end

    %% PHASE 2: ATOMIC AD PERSISTENCE
    rect rgb(245, 255, 245)
    Note over User, API: Phase 2: Listing Creation & Atomic Attachment
    User->>API: 2. POST /api/v1/ads { title, price, categoryId, images: [{ mediaId }] }
    API->>API: Category schema validation & anti-fraud heuristics
    
    critical Prisma $transaction (Atomic)
        API->>DB: Insert "ads" row (status: ACTIVE / PENDING_REVIEW)
        API->>DB: Insert "ad_images" row (WebP variants URLs, sortOrder)
        API->>DB: Update "media" row (isAttached: true, entityId: ad.id, scope: AD_IMAGE)
        API->>DB: Insert dynamic "ad_attribute_values"
    end

    API->>Redis: Invalidate cache (catalog feeds, category counts)
    API-->>User: 201 Created { success: true, data: { adId, slug } }
    end
```

---

### 2. Real-Time Chat & Push Notifications

Peer-to-peer real-time chat with clustered Socket.IO, PostgreSQL persistence, and asynchronous Web Push fallback:

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Buyer (Browser / App)
    participant Nginx as Nginx Gateway
    participant SocketServer as Fastify Socket.IO (:5000)
    participant Redis as Redis Adapter & Pub/Sub
    participant DB as PostgreSQL (Prisma)
    participant BullMQ as BullMQ Push Queue
    participant Worker as Background Worker
    actor Seller as Seller (Browser / Phone)

    Note over Buyer, Seller: Instant Real-Time Messaging & Status Receipts
    Buyer->>Nginx: Emit "send_message" via WebSocket (/socket.io)
    Nginx->>SocketServer: Forward WebSocket Frame (Upgrade)
    SocketServer->>DB: Persist Message (status: SENT)
    SocketServer->>Redis: Publish to Redis Channel "chat:conversation:{id}"

    alt Seller is Active & In-Room
        Redis->>SocketServer: Distribute to recipient socket connection
        SocketServer->>Nginx: Stream "new_message" frame
        Nginx->>Seller: Deliver message + audio chime alert
        Seller->>SocketServer: Emit "mark_delivered"
        SocketServer->>DB: Update message (status: DELIVERED)
        SocketServer-->>Buyer: Emit "message_delivered" receipt
    else Seller Tab Inactive or Offline
        SocketServer->>BullMQ: Enqueue "push-notification" job
        BullMQ->>Worker: Consume push dispatch job
        Worker->>DB: Look up Seller FCM tokens & notification settings
        Worker->>Seller: Dispatch WhatsApp-style Web Push Notification
    end
```

---

### 3. User Registration & BullMQ OTP Queue

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client (Web / Mobile)
    participant Fastify as Fastify API (/api/v1/auth)
    participant DB as PostgreSQL (Prisma ORM)
    participant Redis as Redis 7
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

### 4. Password Recovery & Cooldown Flow

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

### 5. Role-Based Access Control (RBAC) & Capabilities

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

#### Administrative Roles
- **`SUPER_ADMIN`**: Full wildcard (`*`) access across all modules, settings, and audit logs.
- **`ADMIN`**: User governance, category taxonomy, listing approvals, general management.
- **`MODERATOR`**: Investigates user reports, ad moderation, review queues.
- **`CUSTOMER_SUPPORT`**: Support inquiries, dispute resolution, customer records.
- **`FINANCE_ADMIN`**: Transaction monitoring, refunds, monetization plans, revenue reports.
- **`CONTENT_MANAGER`**: Banners, promotional campaigns, category attributes.

#### Marketplace Account Capabilities
- **`can_buy`**: Browse listings, initiate real-time chats, negotiate offers, submit reviews.
- **`can_sell`**: Create, edit, feature, and manage classified listings.
- **`is_dealer`**: Bulk listing management, verified dealer badge, showroom pages.

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Architecture** | pnpm Workspaces Monorepo |
| **API Server** | Fastify 5, TypeScript, Swagger (OpenAPI 3.0), Zod Validation |
| **Database & ORM** | PostgreSQL 16, Prisma 5.22 ORM |
| **Caching & Queues** | Redis 7, BullMQ 5.x |
| **Media Service** | Fastify microservice, Sharp (WebP variants), Multer |
| **Storage Engine** | Local persistent volumes mounted at `/data/olx-media` (or `/uploads`) |
| **Real-Time Engine** | Socket.IO v4 clustered via `@socket.io/redis-adapter` |
| **Frontend Web** | React 18, Vite, Tailwind CSS, Lucide Icons, Zustand, PWA |
| **Admin Portal** | React 18, Tailwind CSS, TanStack Query, Lucide Icons |
| **Reverse Proxy** | Nginx (static routing, proxy caching, rate limiting) |

---

## Key Features

- **High-Performance Media Service**: Decoupled WebP generation with disk caching, automatic thumbnailing, and admin disk storage capacity graphs.
- **Deduplicated Clustered Chat**: Multi-server Socket.IO clustering with automatic message deduplication, live presence indicators, and delivery/read receipts.
- **Anti-Fraud Security System**: Real-time content heuristics check for UPI/QR code scams, suspicious keywords, and rapid messaging bursts.
- **Dynamic Category Specifications**: Extensible attribute definitions per category (text, number, select, multi-select, boolean) rendered dynamically on frontend forms.
- **FCM Web Push & Service Worker**: Background push notification dispatch for offline users and seamless PWA navigation.

---

## Environment Variables & Deployment Guide

This section is dedicated to deployment engineers setting up the application on a VPS, cloud VM, or staging server.

### Where to Place `.env` Files

The platform uses environment files in two primary modes:

#### 1. Containerized Deployment (Docker Compose) — *Recommended*
When running via `docker compose`, the **single source of truth** is the root `.env` file at the repository root:
```text
olx/
└── .env    <-- Copy from .env.example
```
Docker Compose reads this single file and automatically passes variables to all container services (`postgres`, `redis`, `server`, `media-service`, `workers`, `admin`, `client`, `nginx`).

#### 2. Native / Bare-Metal Process Management (PM2, systemd, or local CLI)
When running services directly on the host without Docker:
* **Root**: `olx/.env` (Global fallback)
* **Backend API**: `olx/apps/server/.env`
* **Media Service**: `olx/apps/media-service/.env`
* **Background Workers**: `olx/apps/workers/.env`
* **Database (Prisma CLI)**: `olx/packages/database/.env`
* **Customer Client**: `olx/apps/client/.env`
* **Admin Portal**: `olx/apps/admin/.env`

---

### Environment Variables Reference

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Target Service | Required? | Description & Production Guidance |
|:---|:---|:---:|:---|
| `NODE_ENV` | All Services | **Yes** | Set to `production` on deployment servers. Controls error masking and logging verbosity. |
| `DB_NAME` | Postgres, Server | **Yes** | Database name (e.g. `olx_marketplace`). |
| `DB_USER` | Postgres, Server | **Yes** | PostgreSQL master username. |
| `DB_PASSWORD` | Postgres, Server | **Yes** | Strong alphanumeric database password. |
| `DB_PORT` | Postgres (Host) | No | Exposed host port for PostgreSQL (default: `5433` for dev, `5432` for production). |
| `DATABASE_URL` | Server, Media, Workers, DB | **Yes** | Full PostgreSQL connection string: `postgresql://USER:PASS@HOST:PORT/DB?schema=public`. In Docker: `postgres:5432`. |
| `REDIS_URL` | Server, Media, Workers | **Yes** | Redis connection URI: `redis://redis:6379` (in Docker) or `redis://localhost:6379`. |
| `PORT` | Server | No | API server listening port (default: `5000`). |
| `JWT_ACCESS_SECRET` | Server | **Yes** | High-entropy secret for signing access tokens. Generate with: `openssl rand -hex 32`. |
| `JWT_REFRESH_SECRET` | Server | **Yes** | High-entropy secret for signing refresh tokens. Generate with: `openssl rand -hex 32`. |
| `JWT_ACCESS_EXPIRES_IN` | Server | No | Access token lifespan (default: `15m`). |
| `JWT_REFRESH_EXPIRES_IN` | Server | No | Refresh token lifespan (default: `30d`). |
| `CLIENT_URL` | Server | **Yes** | Public customer web URL (e.g. `https://bharatmarket.in`). Used for CORS and cookie domain matching. |
| `ADMIN_URL` | Server | No | Public admin portal URL (e.g. `https://admin.bharatmarket.in`). |
| `SMS_PROVIDER` | Server, Workers | **Yes** | `MOCK` (development only), `MSG91`, or `TWILIO`. |
| `MOCK_OTP_CODE` | Server | No | Default mock code (`123456`) when `SMS_PROVIDER=MOCK`. Never enable in production. |
| `MEDIA_ROOT` | Media, Workers | **Yes** | Physical directory for media storage (e.g. `/data/olx-media` or `./uploads`). |
| `MEDIA_PUBLIC_BASE_URL` | Server, Media | **Yes** | Public URL prefix for serving media assets (e.g. `https://bharatmarket.in/media`). |
| `MEDIA_SERVICE_PORT` | Media Service | No | Media microservice port (default: `5005`). |
| `MEDIA_SERVICE_URL` | Server | **Yes** | Internal service URI for server-to-media communication (in Docker: `http://media-service:5005`). |
| `ENABLE_RATE_LIMIT` | Server | No | Set to `true` in production to enforce Redis sliding-window request throttling. |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Server, Workers | Optional | Path to Firebase Admin SDK JSON key file for FCM web push notifications. |

---

### Production Deployment Security Checklist

Before exposing the server to public traffic:

1. **Rotate Secrets**:
   ```bash
   # Generate distinct cryptographic keys for JWT tokens
   openssl rand -hex 32   # Use for JWT_ACCESS_SECRET
   openssl rand -hex 32   # Use for JWT_REFRESH_SECRET
   ```
2. **Configure Real SMS Gateway**:
   Set `SMS_PROVIDER=MSG91` or `SMS_PROVIDER=TWILIO` and configure your API authentication keys. Ensure `SMS_PROVIDER=MOCK` is disabled.
3. **Enable Rate Limiting**:
   Set `ENABLE_RATE_LIMIT=true` in `.env` to protect API endpoints and OTP generation against abuse and DDoS.
4. **Persistent Media Volumes**:
   Ensure the directory configured in `MEDIA_ROOT` (e.g., `/data/olx-media`) resides on a persistent, backed-up host volume with sufficient disk space.
5. **Execute Database Migrations**:
   Run schema migrations against the live database:
   ```bash
   pnpm --filter @olx/database exec prisma migrate deploy
   ```
6. **SSL & Reverse Proxy**:
   Deploy Nginx with Let's Encrypt SSL/TLS certificates terminating at port 443, proxying to the internal Docker network.

---

## Getting Started

### Prerequisites

- **Node.js**: `v20 LTS` or higher
- **pnpm**: `v9` or higher (`corepack enable pnpm`)
- **Docker Desktop / Docker Engine**: `v24+` with Docker Compose

---

### Running with Docker Compose

To boot all infrastructure services (PostgreSQL, Redis, Media Microservice, Fastify API Server, BullMQ Workers, and Nginx proxy):

1. **Initialize configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Start containerized stack:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

3. **Verify running containers:**
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

4. **Service Endpoints**:
   - **Customer Web Application**: [http://localhost:5173](http://localhost:5173)
   - **Admin Operations Portal**: [http://localhost:5174](http://localhost:5174)
   - **Backend REST API**: [http://localhost:5000](http://localhost:5000)
   - **Interactive Swagger Docs**: [http://localhost:5000/docs](http://localhost:5000/docs)
   - **Media Service**: [http://localhost:5005](http://localhost:5005)
   - **Nginx Unified Gateway**: [http://localhost](http://localhost)

5. **Stopping containers:**
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

---

### Running in Native Local Development Mode

If you prefer to run services natively using local Node.js processes:

1. **Install workspace dependencies:**
   ```bash
   pnpm install
   ```

2. **Start database & cache containers:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d postgres redis
   ```

3. **Initialize database schema & initial seed data:**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

4. **Launch all applications concurrently:**
   ```bash
   pnpm dev
   ```

---

## License

This project is licensed under the [MIT License](LICENSE).
