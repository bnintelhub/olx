# BharatMarket (OLX Orbit) — Full-Stack Monorepo

> Production-grade peer-to-peer classifieds marketplace built with **Fastify 5**, **PostgreSQL 16**, **Redis 7**, **BullMQ**, **Sharp WebP Media Pipeline**, **Socket.IO (Redis Clustered)**, and **React 18 (Vite + Tailwind)** inside a high-performance **pnpm** monorepo.

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
- [Deployment Guide for Engineers](#deployment-guide-for-engineers)
  - [Where to Place `.env` Files](#where-to-place-env-files)
  - [Method 1: Deploying with Docker (Recommended)](#method-1-deploying-with-docker-recommended)
  - [Method 2: Deploying without Docker (Bare-Metal / PM2 / Host Nginx)](#method-2-deploying-without-docker-bare-metal--pm2--host-nginx)
  - [Environment Variables Reference](#environment-variables-reference)
  - [Production Deployment Security Checklist](#production-deployment-security-checklist)
- [Local Development Getting Started](#local-development-getting-started)
- [License](#license)

---

## Monorepo Architecture

The repository is organized as a unified, high-performance **pnpm monorepo**:

### Workspace Structure

```text
olx/
├── apps/
│   ├── client/              # React 18 + Vite + Tailwind Customer PWA (@olx/client)
│   ├── admin/               # React 18 + Vite + Tailwind Moderation & Ops Portal (@olx/admin)
│   ├── server/              # Fastify 5 REST API, Clustered Socket.IO & Media Uploads (@olx/server)
│   └── workers/             # BullMQ Background Job Workers (Sharp WebP & Push Dispatch) (@olx/workers)
├── packages/
│   ├── database/            # Prisma 5.22 ORM, PostgreSQL schema, migrations & seeders (@olx/database)
│   └── shared/              # Shared types, storage adapters, validation schemas (@olx/shared)
├── infrastructure/
│   ├── docker/dev/          # Development container Dockerfiles
│   ├── docker/prod/         # Production container Dockerfiles
│   ├── nginx/               # Nginx reverse proxy gateway configurations
│   └── secrets/             # Environment variable templates and secret examples
├── docs/                    # In-depth architectural & deployment documentation
│   ├── DEPLOYMENT_STRATEGY.md # Comprehensive deployment & operations manual
│   └── media.md             # Media upload, storage, and Sharp processing pipeline
├── docker-compose.prod.yml  # Production Docker Compose stack (Self-hosted DB + Redis)
├── docker-compose.deployment.yml # Production Docker Compose stack (External / Cloud DB)
├── docker-compose.dev.yml   # Development Docker Compose stack
├── pnpm-workspace.yaml      # Monorepo packages mapping
└── package.json             # Root monorepo orchestration scripts
```

### Available Monorepo Commands

All commands can be executed directly from the monorepo root:

| Command | Action |
|:---|:---|
| `pnpm dev` | Starts all applications (`client`, `admin`, `server`, `workers`) concurrently |
| `pnpm --filter @olx/client dev` | Starts the customer web application on port `5173` |
| `pnpm --filter @olx/admin dev` | Starts the Admin Operations Portal on port `5174` |
| `pnpm --filter @olx/server dev` | Starts the Fastify API backend in watch mode on port `5000` |
| `pnpm --filter @olx/workers dev` | Starts BullMQ background workers in watch mode |
| `pnpm build` | Compiles all packages and applications in topological dependency order |
| `pnpm test` | Runs unit and integration test suites |
| `pnpm db:generate` | Generates the Prisma Client in `@olx/database` |
| `pnpm db:push` | Synchronizes Prisma schema changes directly to PostgreSQL |
| `pnpm db:seed` | Seeds database with categories, locations, sample ads, and admin user |
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
        NginxGateway["Nginx Gateway (:80 / :443)<br/>SSL Termination • Rate Limiting • Direct Static Delivery"]
    end

    subgraph Services["Application Services"]
        ClientContainer["Client Container (:80)<br/>Static SPA Server"]
        AdminContainer["Admin Container (:80)<br/>Static SPA Server"]
        APIServer["Fastify API Server (:5000)<br/>REST Endpoints • Clustered Socket.IO • Direct Upload Ingestion"]
        WorkerService["BullMQ Worker Service<br/>Sharp WebP Processing • Push Dispatch • Cleanup"]
    end

    subgraph StorageTier["Data & Cache Persistence"]
        PostgresDB[("PostgreSQL 16 Database<br/>Prisma ORM • Relational Data")]
        RedisStore[("Redis 7 Cache & Session<br/>BullMQ Queues • Socket.IO Clustered Adapter")]
        MediaVolume[("Persistent Media Storage<br/>/data/olx-media")]
    end

    Clients -->|"HTTP(S) & WebSocket"| NginxGateway

    NginxGateway -->|"Path: /"| ClientContainer
    NginxGateway -->|"Path: /admin/"| AdminContainer
    NginxGateway -->|"Path: /api/ & /socket.io"| APIServer
    NginxGateway -->|"Path: /media/ (Cached Static)"| MediaVolume

    APIServer -->|"Read & Write Queries"| PostgresDB
    APIServer -->|"Cache, Rate Limits & Pub/Sub"| RedisStore
    APIServer -->|"Enqueue Tasks"| RedisStore
    APIServer -->|"Save Ingestion Uploads"| MediaVolume

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
        AdminSPA["Admin Portal (admin:80)<br/>Path: /admin/*<br/>SPA Fallback (try_files /index.html)"]
        FastifyAPI["Backend Server (server:5000)<br/>Path: /api/*<br/>REST Endpoints (/api/v1/*)"]
        SocketIO["Fastify Realtime (server:5000)<br/>Path: /socket.io*<br/>Upgrade: WebSocket"]
        MediaStatic["Disk Storage (/data/olx-media)<br/>Path: /media/*<br/>Direct Static Delivery (30d Cache)"]
        HealthCheck["Backend Server (server:5000)<br/>Path: /health<br/>Liveness Probe (/api/v1/health)"]
    end

    Request --> Match

    Match -->|"Path: /"| ClientSPA
    Match -->|"Path: /admin or /admin/*"| AdminSPA
    Match -->|"Path: /api/*"| FastifyAPI
    Match -->|"Path: /socket.io*"| SocketIO
    Match -->|"Path: /media/*"| MediaStatic
    Match -->|"Path: /health"| HealthCheck
```

---

### 1. Media Upload & Optimization Pipeline

Image uploads are decoupled from ad creation to ensure instantaneous UI response times and resilient image compression:

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Client / Admin)
    participant API as Fastify API (:5000)
    participant Storage as Local Storage (/data/olx-media)
    participant Redis as Redis (BullMQ Queue)
    participant Worker as Background Worker (Sharp)
    participant DB as PostgreSQL (Prisma)

    %% PHASE 1: ASYNC UPLOAD & OPTIMIZATION
    rect rgb(240, 248, 255)
    Note over User, Storage: Phase 1: Image Upload & Background WebP Generation
    User->>API: 1. POST /api/v1/uploads?resource=ads (multipart/form-data)
    API->>API: Magic bytes check, MIME & size validation
    API->>Storage: Save original upload & instant preview copy
    API->>DB: Create Media record (status: PROCESSING)
    API->>Redis: Enqueue job to 'media-process' queue
    API-->>User: 201 Created (mediaId & immediate preview URL)

    Redis->>Worker: Consume job (mediaId)
    Worker->>Worker: Sharp processing: 4 WebP variants (thumb, card, medium, large)
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

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Architecture** | pnpm Workspaces Monorepo |
| **API Server** | Fastify 5, TypeScript, Swagger (OpenAPI 3.0), Zod Validation |
| **Database & ORM** | PostgreSQL 16, Prisma 5.22 ORM |
| **Caching & Queues** | Redis 7, BullMQ 5.x |
| **Media Pipeline** | Fastify multipart ingestion, Sharp Libvips (4 WebP tiers), local persistent disk |
| **Storage Engine** | Local persistent volumes mounted at `/data/olx-media` (or `./data/olx-media`) |
| **Real-Time Engine** | Socket.IO v4 clustered via `@socket.io/redis-adapter` |
| **Frontend Web** | React 18, Vite, Tailwind CSS, Lucide Icons, Zustand, PWA |
| **Admin Portal** | React 18, Tailwind CSS, TanStack Query, Lucide Icons |
| **Reverse Proxy** | Nginx (static routing, direct disk media delivery, WebSocket proxying) |

---

## Key Features

- **Decoupled WebP Media System**: Immediate upload preview response with zero race conditions, asynchronous 4-tier Sharp WebP generation, and admin disk capacity monitoring.
- **Clustered Real-Time Chat**: Multi-node Socket.IO clustering with automatic message deduplication, delivery receipts, read receipts, and audio chime alerts.
- **Anti-Fraud Security Engine**: Content heuristics scan listings and messages for UPI/QR code scams, suspicious keywords, and rapid messaging bursts.
- **Dynamic Category Specifications**: Extensible attribute definitions per category (text, number, select, multi-select, boolean) rendered dynamically on frontend forms.
- **FCM Web Push & Service Worker**: Background push notification dispatch for offline users and seamless PWA navigation.

---

## Deployment Guide for Engineers

This section provides clear, end-to-end instructions for deployment engineers.

> 📖 **Full Operations Manual**: For extensive configurations, SSL setup, and multi-server topologies, see [DEPLOYMENT_STRATEGY.md](docs/DEPLOYMENT_STRATEGY.md).

### Where to Place `.env` Files

| Mode | Location | Purpose |
|:---|:---|:---|
| **Docker Deployment** | `olx/.env` (Root) | **Single source of truth**. Docker Compose automatically injects this into all containers (`postgres`, `redis`, `server`, `workers`, `client`, `admin`, `nginx`). |
| **Without Docker (Native Node/PM2)** | `olx/.env` (Root) | Read by all monorepo commands (`pnpm dev`, `pnpm build`, `pnpm db:*`) and PM2. |
| **Individual App Overrides** *(optional)* | `apps/server/.env`<br/>`apps/workers/.env`<br/>`packages/database/.env` | Individual environment files if you choose not to use the root `.env`. |
| **Vite Client Bundle** | `apps/client/.env.production` | Build-time variables (`VITE_FIREBASE_VAPID_KEY`) embedded into the client SPA bundle. |
| **Vite Admin Bundle** | `apps/admin/.env.production` | Build-time variables embedded into the admin SPA bundle. |

---

### Method 1: Deploying with Docker (Recommended)

Docker Compose provides a complete, containerized environment in a single command.

#### Step 1: Clone & Configure `.env`
```bash
git clone https://github.com/your-org/olx-marketplace.git /var/www/olx
cd /var/www/olx

# Copy example environment configuration
cp .env.example .env
nano .env
```

Set your production database password, domain names (`CLIENT_URL=https://yourdomain.com`), and generate secure JWT secrets:
```bash
openssl rand -hex 32  # Run twice: once for JWT_ACCESS_SECRET, once for JWT_REFRESH_SECRET
```

#### Step 2: Start Container Stack
- **Option A: Self-hosted PostgreSQL & Redis containers (Standard)**:
  ```bash
  docker compose -f docker-compose.prod.yml up -d --build
  ```
- **Option B: Managed Cloud Database (Neon / Supabase / AWS RDS)**:
  ```bash
  docker compose -f docker-compose.deployment.yml up -d --build
  ```

#### Step 3: Run Database Migrations & Initial Seed
```bash
# Push schema migrations
docker compose -f docker-compose.prod.yml exec server pnpm db:push

# Seed categories, locations, and default admin account
docker compose -f docker-compose.prod.yml exec server pnpm db:seed
```

#### Step 4: Verify Health
```bash
curl -f http://localhost/health
# Expected: {"status":"ok","timestamp":"..."}
```

---

### Method 2: Deploying without Docker (Bare-Metal / PM2 / Host Nginx)

For deployments on Ubuntu 22.04 / 24.04 LTS running Node.js natively on the host:

#### Step 1: Install System Prerequisites
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git build-essential nginx certbot python3-certbot-nginx postgresql redis-server

# Install Node.js 20 LTS & pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
corepack enable && corepack prepare pnpm@9 --activate
sudo npm install -g pm2
```

#### Step 2: Configure Database & Storage Directory
```bash
# Setup PostgreSQL database
sudo -u postgres psql -c "CREATE USER olx_user WITH PASSWORD 'StrongPassword2026!';"
sudo -u postgres psql -c "CREATE DATABASE olx_marketplace OWNER olx_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE olx_marketplace TO olx_user;"

# Create media directory
sudo mkdir -p /data/olx-media
sudo chown -R $USER:www-data /data/olx-media
sudo chmod -R 775 /data/olx-media
```

#### Step 3: Setup Codebase & `.env`
```bash
sudo mkdir -p /var/www/olx && sudo chown -R $USER:$USER /var/www/olx
git clone https://github.com/your-org/olx-marketplace.git /var/www/olx
cd /var/www/olx

pnpm install --frozen-lockfile
cp .env.example .env
nano .env
```
Ensure `DATABASE_URL` is set to `postgresql://olx_user:StrongPassword2026!@localhost:5432/olx_marketplace?schema=public` and `MEDIA_ROOT=/data/olx-media`.

#### Step 4: Migrate & Build
```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm build
```

#### Step 5: Start Services with PM2
```bash
# Start API server and BullMQ workers
pm2 start apps/server/dist/server.js --name "olx-server" -i 2
pm2 start apps/workers/dist/index.js --name "olx-workers" -i 1
pm2 save && pm2 startup
```

#### Step 6: Configure Host Nginx
Copy the Nginx configuration template provided in [docs/DEPLOYMENT_STRATEGY.md](docs/DEPLOYMENT_STRATEGY.md#step-9-configure-host-nginx-with-ssl-lets-encrypt-certbot) to `/etc/nginx/sites-available/olx`, enable it, and provision SSL:
```bash
sudo ln -sf /etc/nginx/sites-available/olx /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

---

### Environment Variables Reference

| Variable | Required? | Default | Description |
|:---|:---:|:---|:---|
| `NODE_ENV` | **Yes** | `production` | Set to `production` in live environments. |
| `PORT` | No | `5000` | Port Fastify API listens on. |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection URI (`postgresql://user:pass@host:5432/db?schema=public`). |
| `REDIS_URL` | **Yes** | `redis://redis:6379` | Redis connection URI for cache, Socket.IO adapter, and BullMQ queues. |
| `JWT_ACCESS_SECRET` | **Yes** | — | 32-byte secret for access token signing (`openssl rand -hex 32`). |
| `JWT_REFRESH_SECRET` | **Yes** | — | 32-byte secret for refresh token signing (`openssl rand -hex 32`). |
| `CLIENT_URL` | **Yes** | `http://localhost:5173` | Public frontend URL (used for CORS and cookies). |
| `ADMIN_URL` | No | `http://localhost:5173/admin` | Public admin portal URL. |
| `MEDIA_ROOT` | **Yes** | `/data/olx-media` | Filesystem path for media assets. |
| `MEDIA_PUBLIC_BASE_URL` | **Yes** | `/media` | Public URL prefix for serving static media. |
| `ENABLE_RATE_LIMIT` | No | `true` | Enables Redis sliding-window IP rate limiting. |
| `SMS_PROVIDER` | **Yes** | `MOCK` | `MSG91`, `TWILIO`, or `MOCK` (dev only). |

---

### Production Deployment Security Checklist

1. **Rotate Secrets**: Always generate unique strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
2. **Disable Mock SMS**: Set `SMS_PROVIDER=MSG91` or `SMS_PROVIDER=TWILIO` in production.
3. **Enable Rate Limiting**: Ensure `ENABLE_RATE_LIMIT=true` in `.env`.
4. **Persistent Media Volumes**: Ensure the directory configured in `MEDIA_ROOT` resides on a persistent, backed-up host volume with sufficient disk space.
5. **SSL Termination**: Always route public traffic through Nginx with HTTPS (port 443) using Let's Encrypt certificates.

---

## Local Development Getting Started

### Prerequisites
- **Node.js**: `v20 LTS` or higher
- **pnpm**: `v9` or higher
- **Docker**: For running local PostgreSQL and Redis containers

### Step-by-Step
```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment file
cp .env.example .env

# 3. Start local database & redis containers
docker compose -f docker-compose.dev.yml up -d postgres redis

# 4. Generate Prisma client, push schema & seed initial data
pnpm db:generate
pnpm db:push
pnpm db:seed

# 5. Launch all services concurrently
pnpm dev
```

- **Customer App**: [http://localhost:5173](http://localhost:5173)
- **Admin Portal**: [http://localhost:5174](http://localhost:5174)
- **Fastify API Server**: [http://localhost:5000](http://localhost:5000)
- **Swagger Documentation**: [http://localhost:5000/docs](http://localhost:5000/docs)

---

## License

This project is licensed under the [MIT License](LICENSE).
