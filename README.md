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
│   ├── nginx/               # Nginx reverse proxy gateway configurations (nginx.conf, nginx.prod.conf, nginx.dev.conf)
│   └── monitoring/          # Prometheus & Grafana monitoring
├── docs/                    # In-depth architectural & deployment documentation
│   ├── DEPLOYMENT_STRATEGY.md # Comprehensive deployment & operations manual
│   ├── feed.md                # Phase 1 Feed, Recommendation & Search architecture
│   └── media.md             # Media upload, storage, and Sharp processing pipeline
├── DEPLOYMENT.md            # Quickstart deployment manual for engineers
├── .env                     # Active local development config (native pnpm commands)
├── .env.development         # Docker development configuration (Postgres, Redis, Mock SMS)
├── .env.production          # Production environment configuration (External DB, Redis, PayU, FCM)
├── docker-compose.dev.yml   # Development Docker Compose stack
├── docker-compose.prod.yml  # Production Docker Compose stack (External DB default, optional local-db profile)
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
| `pnpm typecheck` | Generates Prisma client, builds shared packages, and runs TypeScript checks |
| `pnpm test:unit` | Runs server unit tests via Vitest |
| `pnpm db:generate` | Generates the Prisma Client in `@olx/database` |
| `pnpm db:migrate:deploy` | Applies pending Prisma migrations safely in production/staging |
| `pnpm db:push` | Pushes Prisma schema directly to PostgreSQL (local prototyping) |
| `pnpm db:seed` | Seeds database with categories, locations, sample ads, and admin user |
| `pnpm db:seed:roles` | Seeds all 7 staff RBAC roles with default credentials |
| `pnpm db:studio` | Launches Prisma Studio visual database inspector on port `5555` |
| `pnpm docker:prod:build` | Builds and starts the production stack (`docker-compose.prod.yml`) |

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

#### Media URL Single Source of Truth & Delivery Architecture

- **Database Storage**: Strictly relative paths (e.g., `ads/drafts/images/med_123/image.webp`, `categories/med_456/icon/image.webp`). No protocols or hostnames are ever stored in the database.
- **Backend API Output**: Provides clean relative URLs `/media/${filepath}` (or `${MEDIA_PUBLIC_BASE_URL}/media/${filepath}`). Never duplicates protocols (`https://https://` eliminated).
- **Client Handling**: Frontend components (`AdCard`, `MediaPage`, etc.) pass the returned URL straight into `<img src />` without any brittle regex or domain sanitization.
- **Dual-Tier Serving**:
  1. **Nginx Direct**: Nginx serves `/media/*` directly from `/data/olx-media` using Linux kernel `sendfile` (30-day immutable caching).
  2. **Fastify Fallback**: If an image is newly uploaded or not yet on disk (`error_page 404 = @media_backend`), Nginx routes to Fastify, which automatically streams the file from `MEDIA_ROOT`.
- **Cloud & Codespaces Ready**: Runs seamlessly across `localhost`, Docker, VPS, and GitHub Codespaces. *(In GitHub Codespaces, ensure Port 5000 and 5174 Port Visibility is set to **Public** for external browser access).*

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
        Worker->>Seller: Dispatch web push notification
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

- **Personalized Feed & Recommendation Engine (Phase 1)**: Hybrid precomputed + on-demand + cold-start home feed with configurable weighted ranking, cursor pagination, `pg_trgm` dynamic search, and idempotent BullMQ behavioral event processing (see [docs/feed.md](docs/feed.md)).
- **Decoupled WebP Media System**: Immediate upload preview response with zero race conditions, asynchronous 4-tier Sharp WebP generation, and admin disk capacity monitoring.
- **Clustered Real-Time Chat**: Multi-node Socket.IO clustering with automatic message deduplication, delivery receipts, read receipts, and audio chime alerts.
- **Anti-Fraud Security Engine**: Content heuristics scan listings and messages for UPI/QR code scams, suspicious keywords, and rapid messaging bursts.
- **Dynamic Category Specifications**: Extensible attribute definitions per category (text, number, select, multi-select, boolean) rendered dynamically on frontend forms.
- **FCM Web Push & Service Worker**: Background push notification dispatch for offline users and seamless PWA navigation.

---

## Deployment Guide for Engineers

This section provides clear, end-to-end instructions for the current production setup.

> 📖 **Full Operations Manual**: For extensive configurations, SSL setup, and multi-server topologies, see [DEPLOYMENT.md](DEPLOYMENT.md) and [docs/DEPLOYMENT_STRATEGY.md](docs/DEPLOYMENT_STRATEGY.md).

### Where to Place `.env` Files

| Mode | Location | Purpose |
|:---|:---|:---|
| **Production Docker Deployment** | `olx/.env.production` | **Single source of truth for Production**. Injected into all production containers via `docker-compose.prod.yml`. |
| **Development Docker Deployment** | `olx/.env.development` | **Single source of truth for Development**. Injected into dev containers via `docker-compose.dev.yml`. |
| **Native Development (No Docker)** | `olx/.env` (or `.env.development`) | Read automatically by all local monorepo commands (`pnpm dev`, `pnpm build`, `pnpm db:*`). |
| **Templates** | `.env.production.example`<br/>`.env.development.example` | Version-controlled configuration templates with variable descriptions. |

---

### Method 1: Deploying with Docker (Recommended)

The production stack (`docker-compose.prod.yml`) is tuned for a VPS + **external managed PostgreSQL** (e.g., Hostinger Managed PostgreSQL or Neon) so the VPS does not waste RAM/CPU running a database alongside Node, Sharp, and Redis:

- **External PostgreSQL by default**: `postgres` is placed under `profiles: ["local-db"]` and is **not** started unless explicitly requested.
- **Redis 7**: Runs with `--appendonly yes --maxmemory 512mb --maxmemory-policy noeviction` so BullMQ queues and Socket.IO pub/sub never lose jobs or silently evict keys.
- **Nginx HTTPS Gateway (`:80` & `:443`)**: Serves TLS 1.2/1.3 + HTTP/2 on port `443` and redirects HTTP (`80`) → HTTPS (`443`), while keeping `/.well-known/acme-challenge/` (Certbot) and `/health` reachable on port `80`. `Dockerfile.nginx` generates a fallback self-signed certificate at `/etc/nginx/ssl/` so Nginx starts immediately even before Let's Encrypt certs are mounted.

#### Step 1: Clone & Configure `.env.production`
```bash
git clone https://github.com/your-org/olx-marketplace.git /var/www/olx
cd /var/www/olx

# Copy example production environment configuration
cp .env.production.example .env.production
nano .env.production
```

Configure your external PostgreSQL connection, public URL, and secrets:
```bash
# Example external managed PostgreSQL with Prisma pool tuning & SSL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public&connection_limit=15&pool_timeout=20&sslmode=require"
APP_URL="https://yourdomain.com"

# Generate 32-byte secrets (run twice: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)
openssl rand -hex 32
```

#### Step 2: SSL Certificates (Recommended for Live Domain)
By default, `Dockerfile.nginx` provisions a self-signed fallback certificate at `/etc/nginx/ssl/{privkey,fullchain}.pem` so the stack boots cleanly. Because plain DNS (e.g., Hostinger DNS `A` record) only resolves your domain to your VPS IP and does **not** terminate TLS, the SSL certificate must be installed on the VPS Nginx gateway itself (e.g., via Let's Encrypt / Certbot) unless you place a reverse proxy like Cloudflare in front of the VPS:

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant DNS as Domain DNS (Port 53)
    participant VPS as VPS Nginx Gateway (Port 443)
    participant App as Fastify / Client / Admin

    User->>DNS: "What is the IP for yourdomain.com?"
    DNS-->>User: "VPS Public IP (A Record)"
    Note over DNS: DNS stops here (no SSL termination)

    User->>VPS: HTTPS / TLS Handshake (Port 443)
    VPS-->>User: SSL Certificate (fullchain.pem)
    Note over User,VPS: Encrypted HTTPS connection established at VPS Nginx

    User->>VPS: GET /api/v1/feed/home
    VPS->>App: Proxy internal HTTP (:5000 / :80)
    App-->>User: Response via Nginx
```

Place your domain's `fullchain.pem` and `privkey.pem` in `./infrastructure/nginx/ssl/` on the VPS and uncomment the SSL volume mount in `docker-compose.prod.yml`:
```yaml
- ./infrastructure/nginx/ssl:/etc/nginx/ssl:ro
```

#### Step 3: Start Container Stack
```bash
# Default: External PostgreSQL (Hostinger / Neon / Cloud DB)
docker compose -f docker-compose.prod.yml up -d --build

# Optional: Include containerized PostgreSQL on the same VPS
docker compose -f docker-compose.prod.yml --profile local-db up -d --build
```

#### Step 4: Run Database Migrations & Initial Seed
```bash
# Apply production Prisma migrations safely
docker compose -f docker-compose.prod.yml exec server pnpm db:migrate:deploy

# Seed categories, locations, and staff roles
docker compose -f docker-compose.prod.yml exec server pnpm db:seed
docker compose -f docker-compose.prod.yml exec server pnpm db:seed:roles
```

#### Step 5: Verify Health & VPS Firewall
```bash
# HTTP liveness probe (allowed on port 80 without redirect)
curl -f http://localhost/health

# HTTPS liveness probe (use -k if using the built-in fallback self-signed cert)
curl -fk https://localhost/health
# Expected: {"status":"ok","timestamp":"..."}
```
Ensure your VPS firewall (e.g., UFW / Hostinger panel) allows inbound TCP **80** and **443**, and keeps **5000**, **6379**, and **5432** closed externally. Recommended minimum VPS sizing with external DB + 512 MB Redis: **2 vCPU / 4 GB RAM** (2 GB RAM works for light traffic).

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
| `APP_URL` | **Yes** | `http://localhost:5173` | Primary public domain; sub-paths (`/admin`, `/api`, `/media`) derive from this. |
| `DATABASE_URL` | **Yes** | — | PostgreSQL URI. Use `?schema=public&connection_limit=15&pool_timeout=20&sslmode=require` for managed cloud DBs; omit `sslmode=require` for local Docker Postgres (`localhost:5433`). |
| `DIRECT_URL` | No | — | Direct non-pooled PostgreSQL URI for Prisma migrations when using PgBouncer. |
| `REDIS_URL` | **Yes** | `redis://redis:6379` | Redis connection URI for cache, Socket.IO adapter, and BullMQ queues (`redis://localhost:6379` locally). |
| `JWT_ACCESS_SECRET` | **Yes** | — | 32-byte secret for access token signing (`openssl rand -hex 32`). |
| `JWT_REFRESH_SECRET` | **Yes** | — | 32-byte secret for refresh token signing (`openssl rand -hex 32`). |
| `CLIENT_URL` | No | Derived from `APP_URL` | Public frontend URL override (used for CORS and cookies). |
| `ADMIN_URL` | No | Derived from `APP_URL` | Public admin portal URL override. |
| `MEDIA_ROOT` | **Yes** | `/data/olx-media` | Filesystem path for media assets. |
| `MEDIA_PUBLIC_BASE_URL` | No | `/media` | Public URL prefix for serving static media. |
| `ENABLE_RATE_LIMIT` | No | `true` | Enables Redis sliding-window IP rate limiting. |
| `FEED_PERSONALIZATION_ENABLED` | No | `true` | Enables Phase 1 personalized home feed ranking (`false` falls back to chronological). |
| `FEED_ROLLOUT_PERCENT` | No | `100` | Percentage (`0–100`) of users receiving personalized feed ranking. |
| `FEED_EVENT_SHADOW_MODE` | No | `false` | Accepts `POST /api/v1/events` without mutating user interest scores when `true`. |
| `FEED_VERSION` | No | `v1` | Feed cache/version namespace for safe cache invalidation across releases. |
| `FEED_WEIGHTS_JSON` | No | — | Optional JSON override for ranking signal weights (category, location, price, freshness, engagement, quality). |
| `SMS_PROVIDER` | **Yes** | `MOCK` | `MSG91`, `TWILIO`, or `MOCK` (dev only). |

---

### Production Deployment Security Checklist

1. **Rotate Secrets**: Always generate unique 32-byte hex strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
2. **Disable Mock SMS**: Set `SMS_PROVIDER=MSG91` or `SMS_PROVIDER=TWILIO` in `.env.production`.
3. **Enable Rate Limiting**: Ensure `ENABLE_RATE_LIMIT=true` in `.env.production`.
4. **Database SSL & Pooling**: Keep `sslmode=require` and `connection_limit=15` for managed cloud PostgreSQL; whitelist only your VPS IP in the database provider's firewall.
5. **Persistent Media Volumes**: Ensure `MEDIA_ROOT` (`/data/olx-media`) is backed by a persistent, backed-up host volume (`media_data`).
6. **SSL Termination**: Mount valid Let's Encrypt / CA certificates to `/etc/nginx/ssl/` in `nginx` so port `443` serves trusted TLS instead of the fallback self-signed cert.

---

## Local Development Getting Started

### Prerequisites
- **Node.js**: `v20 LTS` or higher
- **pnpm**: `v9` or higher (repo `packageManager` is `pnpm@11.25.0`)
- **Docker**: For running local PostgreSQL (`5433`) and Redis (`6379`) containers

### Step-by-Step
```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment file
cp .env.development.example .env

# 3. Start local database & redis containers
docker compose -f docker-compose.dev.yml up -d postgres redis

# 4. Generate Prisma client, push schema & seed initial data
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm db:seed:roles

# 5. Launch all services concurrently
pnpm dev
```

> **Note on Local `DATABASE_URL`**: Local Docker Postgres (`localhost:5433`) does **not** have SSL enabled by default. Use `postgresql://postgres:postgres@localhost:5433/olx_marketplace?schema=public` without `sslmode=require`.

- **Customer App**: [http://localhost:5173](http://localhost:5173)
- **Admin Portal**: [http://localhost:5174](http://localhost:5174)
- **Fastify API Server**: [http://localhost:5000](http://localhost:5000)
- **Swagger Documentation**: [http://localhost:5000/docs](http://localhost:5000/docs)

---

## License

This project is licensed under the [MIT License](LICENSE).
