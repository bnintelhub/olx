# BLX Orbit (Marketplace Platform) — Complete Deployment Manual

> Comprehensive, step-by-step operations and deployment manual for BLX Orbit. Covers **Docker Compose (All-in-One)**, **Managed Cloud Database Deployment (Neon / Supabase / AWS RDS)**, and **Native Bare-Metal / VPS Deployment without Docker (Ubuntu 22.04 / 24.04 LTS, Node.js, PM2, systemd, Host Nginx)**. Details exact `.env` file locations, variable schemas, Nginx reverse proxy configurations, and persistent local media storage architecture.

---

## Table of Contents

- [1. Architecture Topologies](#1-architecture-topologies)
  - [Topology A: Docker Compose All-in-One (Recommended)](#topology-a-docker-compose-all-in-one-recommended)
  - [Topology B: Docker Compose with Managed Cloud Database](#topology-b-docker-compose-with-managed-cloud-database)
  - [Topology C: Native Bare-Metal Process Deployment without Docker (PM2 & Host Nginx)](#topology-c-native-bare-metal-process-deployment-without-docker-pm2--host-nginx)
- [2. Environment Configuration & Where to Place `.env` Files](#2-environment-configuration--where-to-place-env-files)
  - [Where to Place `.env` Files: At a Glance](#where-to-place-env-files-at-a-glance)
  - [Master Production `.env` Template](#master-production-env-template)
  - [Master Environment Variables Reference](#master-environment-variables-reference)
- [3. Deployment Method 1: Docker Compose All-in-One (Self-Hosted DB)](#3-deployment-method-1-docker-compose-all-in-one-self-hosted-db)
  - [Step 1: System Requirements & Docker Installation](#step-1-system-requirements--docker-installation)
  - [Step 2: Clone Repository & Create `.env`](#step-2-clone-repository--create-env)
  - [Step 3: Build & Launch Containers](#step-3-build--launch-containers)
  - [Step 4: Execute Database Migrations & Initial Seed](#step-4-execute-database-migrations--initial-seed)
  - [Step 5: Verify Health & Running Services](#step-5-verify-health--running-services)
  - [Step 6: Updating Containers in Production](#step-6-updating-containers-in-production)
- [4. Deployment Method 2: Docker Compose with Managed Cloud DB (Neon / Supabase / RDS)](#4-deployment-method-2-docker-compose-with-managed-cloud-db-neon--supabase--rds)
  - [Step 1: Configure `.env` with Cloud Database URI](#step-1-configure-env-with-cloud-database-uri)
  - [Step 2: Launch Deployment Stack](#step-2-launch-deployment-stack)
  - [Step 3: Apply Migrations & Verify](#step-3-apply-migrations--verify)
- [5. Deployment Method 3: Native Bare-Metal / VPS Deployment without Docker](#5-deployment-method-3-native-bare-metal--vps-deployment-without-docker)
  - [Step 1: Install System Dependencies (Ubuntu 22.04 / 24.04 LTS)](#step-1-install-system-dependencies-ubuntu-2204--2404-lts)
  - [Step 2: Install PostgreSQL 16 & Redis 7](#step-2-install-postgresql-16--redis-7)
  - [Step 3: Create Media Storage Directory](#step-3-create-media-storage-directory)
  - [Step 4: Clone Codebase & Install pnpm Dependencies](#step-4-clone-codebase--install-pnpm-dependencies)
  - [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
  - [Step 6: Run Database Migrations & Seed Data](#step-6-run-database-migrations--seed-data)
  - [Step 7: Build All Monorepo Workspaces](#step-7-build-all-monorepo-workspaces)
  - [Step 8: Manage Backend Services with PM2](#step-8-manage-backend-services-with-pm2)
  - [Step 9: Configure Host Nginx with SSL (Let's Encrypt Certbot)](#step-9-configure-host-nginx-with-ssl-lets-encrypt-certbot)
- [6. Local Media Storage & Persistent Volume Architecture](#6-local-media-storage--persistent-volume-architecture)
  - [Directory Hierarchy](#directory-hierarchy)
  - [Static Nginx Direct Disk Serving](#static-nginx-direct-disk-serving)
  - [Media Orphan Cleanup Automation](#media-orphan-cleanup-automation)
- [7. Operational Maintenance & Troubleshooting](#7-operational-maintenance--troubleshooting)
  - [Automated Database Backups](#automated-database-backups)
  - [Viewing Live Service Logs](#viewing-live-service-logs)
  - [Common Troubleshooting Scenarios](#common-troubleshooting-scenarios)

---

## 1. Architecture Topologies

### Topology A: Docker Compose All-in-One (Recommended)

Ideal for single-server VPS instances (Hetzner, DigitalOcean, Linode, AWS EC2, Contabo). All services run in isolated Docker containers communicating over an internal bridge network (`bharatmarket_net`).

```mermaid
flowchart TD
    Internet([Public Internet]) -->|HTTP:80 / HTTPS:443| NGINX[Nginx Gateway Container]

    subgraph Host["Host Linux Server / VPS"]
        NGINX -->|Path: /| ClientSPA["Client SPA (Nginx Container :80)"]
        NGINX -->|Path: /admin/*| AdminSPA["Admin SPA (Nginx Container :80)"]
        NGINX -->|Path: /api/* & /socket.io| FastifyAPI["Fastify API Server (:5000)"]
        NGINX -->|Path: /media/* (Static)| MediaVolume[("Named Volume: media_data<br/>Mount: /data/olx-media")]

        subgraph PrivateNet["Internal Docker Network: bharatmarket_net"]
            FastifyAPI -->|Read / Write| Postgres[(PostgreSQL 16 Alpine)]
            FastifyAPI -->|Pub/Sub & Cache| Redis[(Redis 7 Alpine)]
            FastifyAPI -->|Enqueue Jobs| Redis
            FastifyAPI -->|Write Ingestion & Drafts| MediaVolume
            Workers["BullMQ Sharp Workers"] -->|Poll Image & Push Jobs| Redis
            Workers -->|Write WebP Variants| MediaVolume
            Workers -->|Status Update| Postgres
        end
    end
```

---

### Topology B: Docker Compose with Managed Cloud Database

Ideal for autoscaling setups using serverless/managed cloud databases (Neon, Supabase, AWS Aurora/RDS, Upstash Redis). No local PostgreSQL or Redis container needed on the host.

```mermaid
flowchart TD
    Internet([Public Internet]) -->|HTTP:80 / HTTPS:443| NGINX[Nginx Gateway Container]

    subgraph Host["Host App Server (Docker Compose)"]
        NGINX --> ClientSPA["Client Web SPA"]
        NGINX --> AdminSPA["Admin Portal SPA"]
        NGINX --> FastifyAPI["Fastify API (:5000)"]
        NGINX --> MediaVol[("Persistent Volume: media_data")]
        FastifyAPI --> MediaVol
        Workers["BullMQ Sharp Workers"] --> MediaVol
    end

    subgraph Cloud["Managed Cloud Infrastructure"]
        FastifyAPI -->|"DATABASE_URL (SSL)"| CloudDB[("Neon / Supabase / AWS RDS")]
        Workers -->|"DATABASE_URL (SSL)"| CloudDB
        FastifyAPI -->|"REDIS_URL"| CloudRedis[("Upstash / Managed Redis")]
        Workers -->|"REDIS_URL"| CloudRedis
    end
```

---

### Topology C: Native Bare-Metal Process Deployment without Docker (PM2 & Host Nginx)

For deployment engineers who run services directly on the host operating system using **Node.js 20+**, **PM2**, native **PostgreSQL 16**, native **Redis 7**, and **Host Nginx**.

```mermaid
flowchart TD
    Users([Public Web Traffic]) -->|Port 80 / 443 (SSL)| HostNginx[Host Nginx Engine]

    HostNginx -->|Static /| ClientDist["/var/www/olx/apps/client/dist"]
    HostNginx -->|Static /admin/| AdminDist["/var/www/olx/apps/admin/dist"]
    HostNginx -->|Static /media/| LocalMedia["/data/olx-media (Disk Cache)"]
    HostNginx -->|Proxy :5000| PM2_Server["PM2: @olx/server (Fastify)"]
    HostNginx -->|Proxy /socket.io| PM2_Server

    PM2_Workers["PM2: @olx/workers (BullMQ)"] --> LocalMedia
    PM2_Server --> LocalMedia

    PM2_Server --> HostPostgres[("Host PostgreSQL 16 (:5432)")]
    PM2_Workers --> HostPostgres
    PM2_Server --> HostRedis[("Host Redis 7 (:6379)")]
    PM2_Workers --> HostRedis
```

---

## 2. Environment Configuration & Where to Place `.env` Files

### Where to Place `.env` Files: At a Glance

| Deployment Mode | File Location | Scope / Target Services | Notes |
|:---|:---|:---|:---|
| **Docker Compose (Production)** | `olx/.env` (repo root) | Passed to all Docker containers (`postgres`, `redis`, `server`, `workers`, `client`, `admin`, `nginx`) | Single source of truth. Copy from `.env.example`. |
| **Docker Compose (Dev)** | `olx/.env` (repo root) | Local development stack via `docker-compose.dev.yml` | Sets ports `5433` for DB, `6379` for Redis. |
| **Without Docker (Native Node/PM2)** | `olx/.env` (repo root) | Global fallback read by pnpm workspace scripts and PM2 | Preferred single file. |
| **Without Docker (App-Specific)** | `olx/apps/server/.env` | Fastify REST API and Socket.IO server | Optional if root `.env` is present. |
| **Without Docker (App-Specific)** | `olx/apps/workers/.env` | BullMQ background workers (Sharp + FCM) | Optional if root `.env` is present. |
| **Without Docker (App-Specific)** | `olx/packages/database/.env` | Prisma CLI migrations (`pnpm db:push`, `prisma migrate`) | Optional if root `.env` is present. |
| **Without Docker (Frontend Client)** | `olx/apps/client/.env.production` | Vite build bundle for Customer Web App | Embedded into client bundle at `pnpm build` time. |
| **Without Docker (Frontend Admin)** | `olx/apps/admin/.env.production` | Vite build bundle for Admin Portal | Embedded into admin bundle at `pnpm build` time. |

---

### Master Production `.env` Template

Create this file at `olx/.env` (or copy from `olx/.env.example`):

```bash
# ========================================================
# BLX ORBIT — Master Production Environment Configuration
# ========================================================

# --- Environment & Ports ---
NODE_ENV=production
PORT=5000

# --- PostgreSQL Database ---
# For self-hosted PostgreSQL container:
DB_NAME=olx_marketplace
DB_USER=postgres
DB_PASSWORD=your_super_strong_postgres_password_2026
DB_PORT=5432
DATABASE_URL="postgresql://postgres:your_super_strong_postgres_password_2026@postgres:5432/olx_marketplace?schema=public"

# If deploying without Docker (local PostgreSQL on host):
# DATABASE_URL="postgresql://postgres:your_super_strong_postgres_password_2026@localhost:5432/olx_marketplace?schema=public"

# If using Neon / Supabase / AWS RDS:
# DATABASE_URL="postgresql://user:password@ep-cool-db-123456.us-east-1.aws.neon.tech/olx_marketplace?sslmode=require"

# --- Redis Cache & BullMQ Queue ---
# In Docker Compose:
REDIS_URL="redis://redis:6379"
# Without Docker (Host Redis):
# REDIS_URL="redis://localhost:6379"

# --- Authentication & JWT Secrets ---
# Generate using: openssl rand -hex 32
JWT_ACCESS_SECRET=a8f9c2d1e0b3456789abcdef0123456789abcdef0123456789abcdef01234567
JWT_REFRESH_SECRET=b7e6d5c4a3f2109876543210fedcba9876543210fedcba9876543210fedcba98
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# --- Public Domain URLs (CORS & Cookie Scope) ---
CLIENT_URL=https://yourdomain.com
ADMIN_URL=https://yourdomain.com/admin

# --- Security & Throttling ---
ENABLE_RATE_LIMIT=true

# --- SMS Verification Gateway ---
# Options: MSG91, TWILIO, MOCK
SMS_PROVIDER=MSG91
MOCK_OTP_CODE=
OTP_EXPIRY_SECONDS=300
OTP_RESEND_COOLDOWN_SECONDS=45

# MSG91 Credentials (if SMS_PROVIDER=MSG91)
# MSG91_AUTH_KEY=your_msg91_auth_key
# MSG91_TEMPLATE_ID=your_msg91_template_id

# --- Initial Super Admin Account ---
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeThisStrongAdminPassword2026!
ADMIN_LOGIN_WINDOW_MS=900000
ADMIN_LOGIN_MAX_ATTEMPTS=10

# --- Local Media Storage System ---
# In Docker:
MEDIA_ROOT=/data/olx-media
# Without Docker (Host filesystem):
# MEDIA_ROOT=/data/olx-media
# (or relative to workspace: MEDIA_ROOT=./data/olx-media)

MEDIA_PUBLIC_BASE_URL=https://yourdomain.com/media

# --- Firebase Cloud Messaging & Web Push (Optional) ---
# Public VAPID key used by client browser for push notifications
VITE_FIREBASE_VAPID_KEY=your_public_fcm_vapid_key
FIREBASE_VAPID_KEY=your_public_fcm_vapid_key
# Path to service account json if using server-side FCM
FIREBASE_SERVICE_ACCOUNT_PATH=
```

---

### Master Environment Variables Reference

| Variable | Required | Default | Description |
|:---|:---:|:---|:---|
| `NODE_ENV` | **Yes** | `production` | Set to `production` in live environments. Masks stack traces and optimizes execution. |
| `PORT` | No | `5000` | HTTP port the Fastify REST API listens on. |
| `DATABASE_URL` | **Yes** | — | Full PostgreSQL connection URI including user, password, host, port, dbname, and schema. |
| `REDIS_URL` | **Yes** | `redis://redis:6379` | Redis connection URI for caching, Socket.IO clustering, and BullMQ queues. |
| `JWT_ACCESS_SECRET` | **Yes** | — | 32-byte hexadecimal secret for signing short-lived access tokens. |
| `JWT_REFRESH_SECRET` | **Yes** | — | 32-byte hexadecimal secret for signing long-lived refresh tokens. |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Token expiry (e.g. `15m`, `1h`). |
| `JWT_REFRESH_EXPIRES_IN` | No | `30d` | Refresh token expiry (e.g. `30d`, `7d`). |
| `CLIENT_URL` | **Yes** | `http://localhost:5173` | Fully qualified public frontend URL (used for CORS and HTTP-only cookie origin). |
| `ADMIN_URL` | No | `http://localhost:5173/admin` | Fully qualified admin portal URL. |
| `ENABLE_RATE_LIMIT` | No | `true` | When `true`, enforces Redis sliding-window IP rate limits. |
| `SMS_PROVIDER` | **Yes** | `MOCK` | Gateway provider: `MSG91`, `TWILIO`, or `MOCK` (mock only in development). |
| `MEDIA_ROOT` | **Yes** | `/data/olx-media` | Physical directory on disk where media files and WebP variants are stored. |
| `MEDIA_PUBLIC_BASE_URL` | **Yes** | `/media` | Base URL prefix where clients fetch static images. |
| `VITE_FIREBASE_VAPID_KEY` | Optional | — | Public FCM VAPID key embedded in frontend build for Web Push. |

---

## 3. Deployment Method 1: Docker Compose All-in-One (Self-Hosted DB)

This method deploys all 7 services (`postgres`, `redis`, `server`, `workers`, `client`, `admin`, `nginx`) in one command.

### Step 1: System Requirements & Docker Installation

Recommended server specifications:
- **OS**: Ubuntu 22.04 LTS or 24.04 LTS
- **Hardware**: 4 vCPU, 8 GB RAM, 60+ GB SSD
- **Docker**: Engine 24+ with Docker Compose v2 (`docker compose version`)

```bash
# Update Ubuntu and install Docker Engine & Compose
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

# Install official Docker repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker on boot
sudo systemctl enable --now docker
```

---

### Step 2: Clone Repository & Create `.env`

```bash
# Clone the repository
git clone https://github.com/your-org/olx-marketplace.git /var/www/olx
cd /var/www/olx

# Create production .env from example
cp .env.example .env

# Edit .env with your actual production secrets and domain
nano .env
```

Ensure your `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are securely generated:
```bash
openssl rand -hex 32
```

---

### Step 3: Build & Launch Containers

```bash
# Build images and start all containers in detached mode
docker compose -f docker-compose.prod.yml up -d --build
```

Docker will create the persistent volumes:
- `postgres_data` (Stores database files)
- `redis_data` (Stores Redis append-only persistence)
- `media_data` (Stores `/data/olx-media` uploaded images and WebP variants)

---

### Step 4: Execute Database Migrations & Initial Seed

Once the database container is healthy:

```bash
# 1. Push schema migrations to PostgreSQL
docker compose -f docker-compose.prod.yml exec server pnpm db:push

# 2. Seed initial categories, locations, and default admin user
docker compose -f docker-compose.prod.yml exec server pnpm db:seed
```

---

### Step 5: Verify Health & Running Services

```bash
# Check status of all containers
docker compose -f docker-compose.prod.yml ps

# Check API health probe
curl -f http://localhost/health
# Expected output: {"status":"ok","timestamp":"..."}

# Inspect logs
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f workers
```

---

### Step 6: Updating Containers in Production

When pulling fresh code from git:

```bash
cd /var/www/olx
git pull origin main

# Rebuild and restart updated containers with zero unnecessary downtime
docker compose -f docker-compose.prod.yml up -d --build

# Run any new migrations
docker compose -f docker-compose.prod.yml exec server pnpm db:push
```

---

## 4. Deployment Method 2: Docker Compose with Managed Cloud DB (Neon / Supabase / RDS)

If using external databases (e.g. Neon PostgreSQL, AWS RDS, Supabase, Upstash Redis):

### Step 1: Configure `.env` with Cloud Database URI

```bash
cd /var/www/olx
cp .env.example .env
nano .env
```

Set:
```bash
DATABASE_URL="postgresql://user:password@ep-name.us-east-2.aws.neon.tech/olx_marketplace?sslmode=require"
REDIS_URL="redis://default:token@cool-redis.upstash.io:6379"
```

### Step 2: Launch Deployment Stack

```bash
# Uses docker-compose.deployment.yml which excludes local postgres/redis
docker compose -f docker-compose.deployment.yml up -d --build
```

### Step 3: Apply Migrations & Verify

```bash
docker compose -f docker-compose.deployment.yml exec server pnpm db:push
docker compose -f docker-compose.deployment.yml exec server pnpm db:seed
curl -f http://localhost/health
```

---

## 5. Deployment Method 3: Native Bare-Metal / VPS Deployment without Docker

This section details how to deploy the entire stack directly on a Linux server without Docker, managed by **PM2** and **Host Nginx**.

### Step 1: Install System Dependencies (Ubuntu 22.04 / 24.04 LTS)

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git build-essential nginx certbot python3-certbot-nginx

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Enable pnpm
corepack enable
corepack prepare pnpm@9 --activate

# Install PM2 globally
sudo npm install -g pm2
```

---

### Step 2: Install PostgreSQL 16 & Redis 7

```bash
# 1. Install PostgreSQL 16
sudo apt-get install -y postgresql postgresql-contrib

# 2. Configure PostgreSQL user and database
sudo -u postgres psql -c "CREATE USER olx_user WITH PASSWORD 'StrongPassword2026!';"
sudo -u postgres psql -c "CREATE DATABASE olx_marketplace OWNER olx_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE olx_marketplace TO olx_user;"

# 3. Install Redis 7
sudo apt-get install -y redis-server
sudo systemctl enable --now redis-server
```

---

### Step 3: Create Media Storage Directory

Create the persistent media directory and grant write access to the deploy user and Nginx:

```bash
sudo mkdir -p /data/olx-media
# Ensure current user and www-data have read/write access
sudo chown -R $USER:www-data /data/olx-media
sudo chmod -R 775 /data/olx-media
```

---

### Step 4: Clone Codebase & Install pnpm Dependencies

```bash
sudo mkdir -p /var/www/olx
sudo chown -R $USER:$USER /var/www/olx
git clone https://github.com/your-org/olx-marketplace.git /var/www/olx
cd /var/www/olx

# Install all monorepo dependencies
pnpm install --frozen-lockfile
```

---

### Step 5: Configure Environment Variables

Create the master `.env` file at the root:

```bash
cp .env.example .env
nano .env
```

Ensure variables point to your local host services:
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://olx_user:StrongPassword2026!@localhost:5432/olx_marketplace?schema=public"
REDIS_URL="redis://localhost:6379"
MEDIA_ROOT=/data/olx-media
MEDIA_PUBLIC_BASE_URL=https://yourdomain.com/media
CLIENT_URL=https://yourdomain.com
ADMIN_URL=https://yourdomain.com/admin
ENABLE_RATE_LIMIT=true
SMS_PROVIDER=MSG91
```

---

### Step 6: Run Database Migrations & Seed Data

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema directly to PostgreSQL
pnpm db:push

# Seed categories, locations, and admin account
pnpm db:seed
```

---

### Step 7: Build All Monorepo Workspaces

```bash
# Compiles packages/database, packages/shared, apps/server, apps/workers, apps/client, apps/admin
pnpm build
```

This generates:
- Backend server bundle in `apps/server/dist/`
- Background worker bundle in `apps/workers/dist/`
- Client static SPA files in `apps/client/dist/`
- Admin static SPA files in `apps/admin/dist/`

---

### Step 8: Manage Backend Services with PM2

Create a PM2 configuration file `ecosystem.config.cjs` at the root `/var/www/olx/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'olx-server',
      script: './apps/server/dist/server.js',
      cwd: '/var/www/olx',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      max_memory_restart: '1G',
      exp_backoff_restart_delay: 100,
    },
    {
      name: 'olx-workers',
      script: './apps/workers/dist/index.js',
      cwd: '/var/www/olx',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '1G',
    },
  ],
};
```

Launch and enable auto-restart on system reboot:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
# Follow the terminal command output to configure systemd startup
```

---

### Step 9: Configure Host Nginx with SSL (Let's Encrypt Certbot)

Create the Nginx site configuration at `/etc/nginx/sites-available/olx`:

```nginx
# Map WebSocket Upgrade headers
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 50M;

    # 1. Direct Static Media Serving from disk
    location /media/ {
        alias /data/olx-media/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        add_header Access-Control-Allow-Origin *;

        # Block access to internal/temp directories
        location ~* ^/media/(temp|quarantine|trash|failed)/ {
            return 403;
        }

        try_files $uri =404;
    }

    # 2. REST API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. Clustered WebSocket (Socket.IO) Proxy
    location /socket.io {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 4. Health Check Probe
    location = /health {
        proxy_pass http://127.0.0.1:5000/api/v1/health;
        proxy_http_version 1.1;
    }

    # 5. Admin Portal SPA (/admin)
    location /admin {
        alias /var/www/olx/apps/admin/dist;
        try_files $uri $uri/ /admin/index.html;
    }

    # 6. Customer Web App SPA (/)
    location / {
        root /var/www/olx/apps/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site and provision SSL certificate:

```bash
# Enable Nginx configuration
sudo ln -sf /etc/nginx/sites-available/olx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Generate Let's Encrypt SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will automatically configure HTTPS on port 443 with auto-renewal.

---

## 6. Local Media Storage & Persistent Volume Architecture

### Directory Hierarchy

All media is saved and read directly under `MEDIA_ROOT` (`/data/olx-media`):

```
/data/olx-media/
├── ads/
│   ├── drafts/
│   │   └── images/{mediaId}/
│   └── {adId}/
│       └── images/{mediaId}/
│           ├── thumbnail.webp    # 300x300 focal crop
│           ├── card.webp         # 600x450 catalog card
│           ├── medium.webp       # 800px preview
│           └── large.webp        # 1600px zoom viewer
├── chats/
│   └── {conversationId}/
│       └── {mediaId}/
│           ├── thumbnail.webp
│           └── large.webp
├── users/
│   └── {userId}/
│       └── avatar/
├── banners/
│   └── {bannerId}/
└── temp/
```

### Static Nginx Direct Disk Serving

- Files requested at `GET /media/...` bypass Node.js and are transmitted directly by Nginx using Linux kernel `sendfile`.
- Fastify also mounts `@fastify/static` pointing to `MEDIA_ROOT` as a fallback when running in local development mode without Nginx.

### Media Orphan Cleanup Automation

To remove unattached draft images older than 24 hours:

```bash
# Call cleanup API endpoint (requires Super Admin token)
curl -X POST "http://localhost:5000/api/v1/admin/media/cleanup-orphans" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"olderThanHours": 24}'
```

---

## 7. Operational Maintenance & Troubleshooting

### Automated Database Backups

Create a daily cron job to back up the PostgreSQL database:

```bash
# /etc/cron.daily/olx-postgres-backup
#!/bin/bash
BACKUP_DIR="/var/backups/olx"
mkdir -p "$BACKUP_DIR"
DATE=$(date +\%Y\%m\%d_\%H\%M\%S)

# Docker backup:
docker exec bharatmarket_postgres pg_dump -U postgres olx_marketplace | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Or Native host backup:
# pg_dump -U olx_user olx_marketplace | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Retain backups for 14 days
find "$BACKUP_DIR" -type f -name "db_*.sql.gz" -mtime +14 -delete
```

Make it executable:
```bash
sudo chmod +x /etc/cron.daily/olx-postgres-backup
```

---

### Viewing Live Service Logs

- **Docker Compose**:
  ```bash
  # View all logs in real-time
  docker compose -f docker-compose.prod.yml logs -f

  # View specific service logs
  docker compose -f docker-compose.prod.yml logs -f server
  docker compose -f docker-compose.prod.yml logs -f workers
  ```

- **Bare-Metal (PM2)**:
  ```bash
  pm2 logs olx-server
  pm2 logs olx-workers
  pm2 monit
  ```

---

### Common Troubleshooting Scenarios

| Issue | Root Cause | Solution |
|:---|:---|:---|
| `502 Bad Gateway` on `/api/` | Fastify backend is stopped or booting | Check `docker compose logs server` or `pm2 status`. Ensure PostgreSQL and Redis are reachable. |
| `404 Not Found` on newly uploaded images | Worker haven't processed WebP variants yet | Fastify creates an instant raw copy upon upload so this is eliminated. Ensure `MEDIA_ROOT` volume is mounted properly across containers. |
| `401 Unauthorized` on refresh loop | JWT secrets or cookie domains mismatched | Verify `CLIENT_URL` matches your exact browser domain (`https://yourdomain.com`). Ensure `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are identical in server config. |
| Socket.IO fails to connect | WebSocket upgrade headers missing in Nginx | Verify `proxy_set_header Upgrade $http_upgrade;` and `Connection $connection_upgrade;` are present in Nginx config. |
| Database migration fails with `P1001` | PostgreSQL container not ready or bad port | Check `DATABASE_URL`. In Docker Compose, the host is `postgres` (port `5432`). On host OS, host is `localhost`. |
