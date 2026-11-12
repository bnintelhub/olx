# BLX Orbit (Marketplace Platform) — Complete Deployment Manual

> Comprehensive operations and deployment manual for BLX Orbit. Covers **Docker Compose (All-in-One)**, **Linux VPS (Ubuntu 22.04 / 24.04 LTS)**, **Individual / Bare-Metal Process Management (PM2 & systemd)**, and **Multi-Server Distributed Clusters**. Details exact `.env` file locations, variable schemas, Nginx reverse proxy configurations, and persistent local media volume architecture.

---

## Table of Contents

- [1. Architecture Topologies](#1-architecture-topologies)
  - [Option A: Docker Compose All-in-One (Recommended)](#option-a-docker-compose-all-in-one-recommended)
  - [Option B: Individual Bare-Metal / Native Processes (PM2 & systemd)](#option-b-individual-bare-metal--native-processes-pm2--systemd)
  - [Option C: Multi-Server Distributed Cluster](#option-c-multi-server-distributed-cluster)
- [2. Environment Files & Variables Matrix](#2-environment-files--variables-matrix)
  - [Where to Place Which `.env` File](#where-to-place-which-env-file)
  - [File 1: Root `.env` (Docker Compose / All-in-One Stack)](#file-1-root-env-docker-compose--all-in-one-stack)
  - [File 2: Database Migration `.env` (`packages/database/.env`)](#file-2-database-migration-env-packagesdatabaseenv)
  - [File 3: Fastify Backend API `.env` (`apps/server/.env`)](#file-3-fastify-backend-api-env-appsserverenv)
  - [File 4: Media Microservice `.env` (`apps/media-service/.env`)](#file-4-media-microservice-env-appsmedia-serviceenv)
  - [File 5: Background Workers `.env` (`apps/workers/.env`)](#file-5-background-workers-env-appsworkersenv)
  - [File 6: Customer Client Web App (`apps/client/.env.production`)](#file-6-customer-client-web-app-appsclientenvproduction)
  - [File 7: Admin Operations Portal (`apps/admin/.env.production`)](#file-7-admin-operations-portal-appsadminenvproduction)
  - [Master Environment Variables Reference](#master-environment-variables-reference)
- [3. Deployment Method 1: Docker Compose Production (Single-Command Stack)](#3-deployment-method-1-docker-compose-production-single-command-stack)
  - [Step 1: Clone Repository & Create Root `.env`](#step-1-clone-repository--create-root-env)
  - [Step 2: Build & Start Containers](#step-2-build--start-containers)
  - [Step 3: Run Database Migrations & Seed Admin User](#step-3-run-database-migrations--seed-admin-user)
  - [Step 4: Verify Container Health & Endpoints](#step-4-verify-container-health--endpoints)
  - [Step 5: Updating Individual Containers](#step-5-updating-individual-containers)
- [4. Deployment Method 2: Linux VPS (Ubuntu 22.04 / 24.04 LTS)](#4-deployment-method-2-linux-vps-ubuntu-2204--2404-lts)
  - [Step 1: Initial VPS Hardening & Firewall (`ufw`)](#step-1-initial-vps-hardening--firewall-ufw)
  - [Step 2: Install Docker Engine & Compose Plugin](#step-2-install-docker-engine--compose-plugin)
  - [Step 3: Directory Setup & Root `.env` Configuration](#step-3-directory-setup--root-env-configuration)
  - [Step 4: Host Nginx Reverse Proxy with Let's Encrypt SSL](#step-4-host-nginx-reverse-proxy-with-lets-encrypt-ssl)
  - [Step 5: Automated Container Startup on Reboot](#step-5-automated-container-startup-on-reboot)
- [5. Deployment Method 3: Individual / Bare-Metal Process Deployment (PM2 & systemd)](#5-deployment-method-3-individual--bare-metal-process-deployment-pm2--systemd)
  - [Step 1: Install System Dependencies (Node 22, pnpm, Postgres, Redis)](#step-1-install-system-dependencies-node-22-pnpm-postgres-redis)
  - [Step 2: Initialize Database & Media Storage Root](#step-2-initialize-database--media-storage-root)
  - [Step 3: Configure Individual `.env` Files](#step-3-configure-individual-env-files)
  - [Step 4: Build Monorepo Workspaces in Order](#step-4-build-monorepo-workspaces-in-order)
  - [Step 5: Run Database Migrations](#step-5-run-database-migrations)
  - [Step 6: Manage Backend Services with PM2](#step-6-manage-backend-services-with-pm2)
  - [Step 7: Host Nginx Configuration for Bare-Metal](#step-7-host-nginx-configuration-for-bare-metal)
- [6. Deployment Method 4: Multi-Server Distributed Cluster](#6-deployment-method-4-multi-server-distributed-cluster)
  - [Server 1: Database & Persistent Storage Node](#server-1-database--persistent-storage-node)
  - [Server 2: Backend API & Worker Cluster](#server-2-backend-api--worker-cluster)
  - [Server 3: Edge Web & CDN](#server-3-edge-web--cdn)
- [7. Local Media Storage & Persistent Volume Architecture](#7-local-media-storage--persistent-volume-architecture)
  - [High-Performance Direct Disk Serving via Nginx](#high-performance-direct-disk-serving-via-nginx)
  - [Shared Docker Volume (`media_data`) Mounting](#shared-docker-volume-media_data-mounting)
- [8. Admin Operations Portal Deployment & Security](#8-admin-operations-portal-deployment--security)
  - [HTTP-Only Cookie Same-Origin Alignment](#http-only-cookie-same-origin-alignment)
  - [IP Whitelisting & Secondary Basic Auth Gate](#ip-whitelisting--secondary-basic-auth-gate)
- [9. Zero-Downtime Deployment & CI/CD Pipeline](#9-zero-downtime-deployment--cicd-pipeline)
- [10. Backups, Monitoring & Disaster Recovery](#10-backups-monitoring--disaster-recovery)

---

## 1. Architecture Topologies

### Option A: Docker Compose All-in-One (Recommended)

Ideal for VPS instances (Hetzner, DigitalOcean, Linode, AWS EC2, Contabo). Minimum requirements: **4 vCPU, 8 GB RAM, 80 GB NVMe SSD**.

```mermaid
flowchart TD
    Internet([Public Internet]) -->|HTTP:80 / HTTPS:443| NGINX[Nginx Gateway Container]

    subgraph VPS["Linux Host / VPS (Ubuntu 22.04/24.04 LTS)"]
        NGINX -->|/| ClientApp["Client Frontend (Nginx Alpine SPA)"]
        NGINX -->|/admin/| AdminPortal["Admin Portal (Nginx Alpine SPA)"]
        NGINX -->|/api/*| FastifyAPI["Fastify API Server (:5000)"]
        NGINX -->|/socket.io| FastifyAPI
        NGINX -->|/media/*| LocalDisk[("Direct Volume Mount: /data/olx-media")]
        NGINX -->|/api/v1/media/*| MediaService["Media Microservice (:5005)"]

        subgraph PrivateNet["Docker Network: bharatmarket_net (Internal Only)"]
            FastifyAPI -->|Read/Write| Postgres[(PostgreSQL 16)]
            FastifyAPI -->|Cache & Socket Adapter| Redis[(Redis 7)]
            FastifyAPI -->|BullMQ Jobs| Redis
            Workers["BullMQ Sharp Workers"] -->|Poll Jobs| Redis
            Workers -->|Store WebP Variants| LocalDisk
            MediaService -->|Direct Write| LocalDisk
        end
    end
```

---

### Option B: Individual Bare-Metal / Native Processes (PM2 & systemd)

For teams running Node.js services directly on the host OS or across lightweight separate VMs without Docker:

```mermaid
flowchart TD
    Users([Public Traffic]) -->|Port 80/443| HostNginx[Host Nginx Engine]
    
    HostNginx -->|Static /| ClientDist["/var/www/olx/apps/client/dist"]
    HostNginx -->|Static /admin/| AdminDist["/var/www/olx/apps/admin/dist"]
    HostNginx -->|/media/| LocalMedia["/data/olx-media (Disk Cache)"]
    HostNginx -->|Proxy :5000| PM2_API["PM2: olx-server (Fastify)"]
    HostNginx -->|Proxy :5005| PM2_Media["PM2: olx-media (Media Service)"]

    PM2_API --> HostPostgres[(PostgreSQL 16 System Service)]
    PM2_API --> HostRedis[(Redis 7 System Service)]
    PM2_Workers["PM2: olx-workers (BullMQ)"] --> HostRedis
    PM2_Workers --> LocalMedia
```

---

## 2. Centralized Infrastructure Secrets & Variables Architecture

To make VPS terminal operations effortless and avoid modifying files across multiple directories, all environment secrets and configuration are organized in a single central directory:

```text
infrastructure/
├── .env.production               # Production top-level app settings (ports, URLs, rates)
├── .env.production.example
├── .env.dev                      # Local dev top-level app settings
├── .env.dev.example
└── secrets/
    ├── database.env              # Production DB (Neon DB / Cloud PostgreSQL)
    ├── database.dev.env          # Dev DB (Local Docker PostgreSQL)
    ├── database.env.example
    ├── redis.env                 # Redis connection URI (internal Docker / local)
    ├── redis.env.example
    ├── jwt.env                   # High-entropy JWT authentication secrets
    ├── jwt.env.example
    ├── payment.env               # PayU payment gateway keys
    ├── payment.env.example
    ├── firebase.env              # Firebase Cloud Messaging credentials
    ├── firebase.env.example
    ├── media.env                 # Media microservice & storage paths
    └── media.env.example
```

### Where to Place Which `.env` File

| Deployment Model | File Path | Target Component | How It Is Loaded |
|:---|:---|:---|:---|
| **Docker Compose (Cloud DB / Neon)** | `infrastructure/secrets/*.env` | `docker-compose.deployment.yml` | Injected securely via `env_file:` |
| **Docker Compose (Local Postgres)** | `infrastructure/secrets/*.env` | `docker-compose.prod.yml` | Injected securely via `env_file:` |
| **Bare-Metal: DB Migrations** | `olx/packages/database/.env` | Prisma CLI | Prisma CLI loads `DATABASE_URL` from this folder |
| **Bare-Metal: Backend API** | `olx/apps/server/.env` | Fastify REST API & Socket.IO | Loaded by server process on boot |
| **Bare-Metal: Media Service** | `olx/apps/media-service/.env` | Media Ingestion Service | Loaded by media-service process on boot |
| **Bare-Metal: Workers** | `olx/apps/workers/.env` | BullMQ Sharp Worker | Loaded by worker process on boot |
| **Frontend: Customer Client** | `olx/apps/client/.env.production` | React 18 Customer SPA | Baked into JS bundle at build time by Vite (`VITE_*`) |
| **Frontend: Admin Portal** | `olx/apps/admin/.env.production` | React 18 Admin Portal | Baked into JS bundle at build time by Vite (`VITE_*`) |

---

### File 1: Root `.env` (Docker Compose / All-in-One Stack)

Create this file at `olx/.env` (copied from `olx/.env.example`). This single file supplies all environment variables to every Docker service:

```env
# ========================================================
# 1. RUNTIME & SYSTEM MODE
# ========================================================
NODE_ENV=production
PORT=5000

# ========================================================
# 2. POSTGRESQL 16 DATABASE
# ========================================================
DB_USER=postgres
DB_PASSWORD=YourUltraSecureDatabasePasswordHere_2026
DB_NAME=olx_marketplace
DB_PORT=5432
DATABASE_URL=postgresql://postgres:YourUltraSecureDatabasePasswordHere_2026@postgres:5432/olx_marketplace?schema=public

# ========================================================
# 3. REDIS 7 IN-MEMORY CACHE & BULLMQ QUEUES
# ========================================================
REDIS_URL=redis://redis:6379

# ========================================================
# 4. JSON WEB TOKEN (JWT) SECURITY SECRETS
# Generate distinct 64-char keys with: openssl rand -hex 32
# ========================================================
JWT_ACCESS_SECRET=e7b41f92c81a5390df0348a230491823ab129304981293049812930498129304
JWT_REFRESH_SECRET=3c82910482910482910482910482910482910482910482910482910482910482
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# ========================================================
# 5. DOMAIN ROUTING & CORS
# ========================================================
CLIENT_URL=http://localhost
ADMIN_URL=http://localhost/admin
MEDIA_PUBLIC_BASE_URL=http://localhost/media

# ========================================================
# 6. LOCAL MEDIA STORAGE ENGINE
# ========================================================
MEDIA_ROOT=/data/olx-media
MEDIA_SERVICE_URL=http://media-service:5005
MAX_FILE_SIZE_BYTES=15728640

# ========================================================
# 7. SMS GATEWAY & OTP CONFIGURATION
# Options: MSG91, TWILIO, or MOCK (never use MOCK in production!)
# ========================================================
SMS_PROVIDER=MOCK
MOCK_OTP_CODE=123456
OTP_EXPIRY_SECONDS=300
OTP_RESEND_COOLDOWN_SECONDS=45

# MSG91 Configuration (If SMS_PROVIDER=MSG91):
MSG91_AUTH_KEY=
MSG91_OTP_TEMPLATE_ID=

# Twilio Configuration (If SMS_PROVIDER=TWILIO):
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ========================================================
# 8. ADMIN SEED CREDENTIALS
# ========================================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@123
ADMIN_LOGIN_WINDOW_MS=900000
ADMIN_LOGIN_MAX_ATTEMPTS=10

# ========================================================
# 9. PERFORMANCE & PUSH NOTIFICATIONS
# ========================================================
ENABLE_RATE_LIMIT=true
FIREBASE_SERVICE_ACCOUNT_PATH=
```

---

### File 2: Database Migration `.env` (`packages/database/.env`)

Required when running Prisma migrations outside Docker (`npx prisma migrate deploy`):

```env
DATABASE_URL="postgresql://postgres:YourUltraSecureDatabasePasswordHere_2026@localhost:5432/olx_marketplace?schema=public"
```

---

### File 3: Fastify Backend API `.env` (`apps/server/.env`)

Required when running the backend API server independently:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:YourUltraSecureDatabasePasswordHere_2026@localhost:5432/olx_marketplace?schema=public
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=e7b41f92c81a5390df0348a230491823ab129304981293049812930498129304
JWT_REFRESH_SECRET=3c82910482910482910482910482910482910482910482910482910482910482
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

CLIENT_URL=https://yourdomain.com
ADMIN_URL=https://yourdomain.com/admin
MEDIA_PUBLIC_BASE_URL=https://yourdomain.com/media
MEDIA_ROOT=/data/olx-media
MEDIA_SERVICE_URL=http://localhost:5005

SMS_PROVIDER=MSG91
ENABLE_RATE_LIMIT=true
FIREBASE_SERVICE_ACCOUNT_PATH=/var/www/olx/firebase-service-account.json
```

---

### File 4: Media Microservice `.env` (`apps/media-service/.env`)

Required when running the media microservice independently:

```env
NODE_ENV=production
PORT=5005
DATABASE_URL=postgresql://postgres:YourUltraSecureDatabasePasswordHere_2026@localhost:5432/olx_marketplace?schema=public
REDIS_URL=redis://localhost:6379
MEDIA_ROOT=/data/olx-media
MEDIA_PUBLIC_BASE_URL=https://yourdomain.com/media
MAX_FILE_SIZE_BYTES=15728640
```

---

### File 5: Background Workers `.env` (`apps/workers/.env`)

Required when running the BullMQ background worker independently:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:YourUltraSecureDatabasePasswordHere_2026@localhost:5432/olx_marketplace?schema=public
REDIS_URL=redis://localhost:6379
MEDIA_ROOT=/data/olx-media
```

---

### File 6: Customer Client Web App (`apps/client/.env.production`)

Baked into static JS assets during `pnpm --filter @olx/client build`:

```env
# Relative API target (Nginx proxies /api/v1 to backend)
VITE_API_BASE_URL=/api/v1
VITE_SOCKET_URL=/
```

---

### File 7: Admin Operations Portal (`apps/admin/.env.production`)

Baked into static JS assets during `pnpm --filter @olx/admin build`:

```env
# Base URL must match Nginx subpath routing
VITE_BASE_URL=/admin/
VITE_API_TARGET=/api/v1
```

---

### Master Environment Variables Reference

| Variable | Target Service | Required? | Default | Description |
|:---|:---|:---:|:---|:---|
| `NODE_ENV` | All Services | **Yes** | `production` | Set to `production` to disable debug traces and enable optimizations |
| `DATABASE_URL` | Server, Media, Workers, DB | **Yes** | — | PostgreSQL connection string with schema parameter |
| `REDIS_URL` | Server, Media, Workers | **Yes** | `redis://localhost:6379` | Redis connection URI for caching, Socket.IO clustering, and BullMQ |
| `JWT_ACCESS_SECRET` | Server | **Yes** | — | 64-character hex secret for signing 15-minute access JWTs |
| `JWT_REFRESH_SECRET` | Server | **Yes** | — | 64-character hex secret for signing 30-day refresh JWTs |
| `CLIENT_URL` | Server | **Yes** | `http://localhost` | Public customer app URL. Used for CORS and cookie domain matching |
| `ADMIN_URL` | Server | No | `http://localhost/admin` | Public admin portal URL |
| `MEDIA_ROOT` | Media, Workers, Server | **Yes** | `/data/olx-media` | Filesystem mount directory for uploads and WebP variants |
| `MEDIA_PUBLIC_BASE_URL` | Server, Media | **Yes** | `http://localhost/media` | Public URL prefix returned in image URLs |
| `MEDIA_SERVICE_URL` | Server | **Yes** | `http://media-service:5005` | Internal endpoint for server-to-media-microservice calls |
| `SMS_PROVIDER` | Server | **Yes** | `MOCK` | Gateway provider: `MSG91`, `TWILIO`, or `MOCK` |
| `ENABLE_RATE_LIMIT` | Server | No | `true` | Enforces Redis sliding-window request throttling |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Server, Workers | Optional | — | Absolute path to Firebase service account JSON for Web Push |

---

## 3. Deployment Method 1: Docker Compose Production (Single-Command Stack)

This is the standard, production-ready containerized deployment using [`docker-compose.prod.yml`](file:///e:/bn-projects/olx-srv/olx/docker-compose.prod.yml).

### Step 1: Clone Repository & Create Root `.env`

```bash
git clone https://github.com/bnintelhub/olx.git
cd olx

# Copy the master template
cp .env.example .env
nano .env
```

Set strong passwords for `DB_PASSWORD`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`.

---

### Step 2: Build & Start Containers

Choose the compose file that matches your database architecture:

#### Option 1: Self-Hosted PostgreSQL Container
When running PostgreSQL inside Docker on the host:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Spins up all 8 services: `postgres`, `redis`, `media-service`, `server`, `workers`, `client`, `admin`, and `nginx`.

#### Option 2: Cloud Managed Database (Neon DB / Supabase / AWS RDS) — *Recommended*
When using an external managed PostgreSQL database like **Neon DB**, no local database container is needed:
```bash
docker compose -f docker-compose.deployment.yml up -d --build
```
* Bypasses the local `postgres` container and `postgres_data` volume.
* Reads `DATABASE_URL` dynamically from your root `.env` (e.g. `postgresql://user:pass@ep-xyz-pooler.aws.neon.tech/neondb?sslmode=require&pgbouncer=true`).
* Starts only the 7 necessary application and gateway services (`redis`, `media-service`, `server`, `workers`, `client`, `admin`, `nginx`).

---

### Step 3: Run Database Migrations & Seed Admin User

Once the database container is healthy:

```bash
# Apply Prisma schema migrations inside the running server container
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy

# Seed initial categories and Super Admin account
docker compose -f docker-compose.prod.yml exec server pnpm --filter @olx/database db:seed
```

---

### Step 4: Verify Container Health & Endpoints

```bash
# Check all container statuses
docker compose -f docker-compose.prod.yml ps

# Test the health check endpoint
curl -i http://localhost/health
```

Expected response:
```json
{"status":"healthy","database":{"type":"PostgreSQL 16 (Docker)","status":"connected"},"redis":{"type":"Redis 7 (Docker)","status":"connected"}}
```

---

### Step 5: Updating Individual Containers

When updating code, you can rebuild and recreate only the modified service without stopping the database or cache:

```bash
# Rebuild only the admin portal
docker compose -f docker-compose.prod.yml up -d --build admin

# Rebuild only the customer client
docker compose -f docker-compose.prod.yml up -d --build client

# Rebuild only the backend API server
docker compose -f docker-compose.prod.yml up -d --build server

# Reload Nginx configuration without downtime
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## 4. Deployment Method 2: Linux VPS (Ubuntu 22.04 / 24.04 LTS)

Follow this guide to deploy onto a fresh Linux VPS (Hetzner, DigitalOcean, Linode, AWS EC2).

### Step 1: Initial VPS Hardening & Firewall (`ufw`)

```bash
# Update OS packages
sudo apt update && sudo apt upgrade -y

# Configure UFW Firewall: Only SSH, HTTP, and HTTPS open publicly
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP (Let’s Encrypt & Web)'
sudo ufw allow 443/tcp comment 'HTTPS (Secure Web)'
sudo ufw enable
sudo ufw status verbose
```

---

### Step 2: Install Docker Engine & Compose Plugin

```bash
# Install Docker prerequisites
sudo apt install -y ca-certificates curl gnupg

# Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow current user to run docker
sudo usermod -aG docker $USER
```

---

### Step 3: Directory Setup & Root `.env` Configuration

```bash
sudo mkdir -p /var/www/olx
sudo chown -R $USER:$USER /var/www/olx
cd /var/www/olx

# Clone codebase
git clone https://github.com/bnintelhub/olx.git .

# Configure production environment
cp .env.example .env
nano .env
```

Ensure your domain names are set:
```env
CLIENT_URL=https://yourdomain.com
ADMIN_URL=https://yourdomain.com/admin
MEDIA_PUBLIC_BASE_URL=https://yourdomain.com/media
```

---

### Step 4: Host Nginx Reverse Proxy with Let's Encrypt SSL

Install Host Nginx and Certbot to manage public SSL:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Obtain SSL Certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

Create `/etc/nginx/sites-available/yourdomain.com.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 35M;

    # Pass all traffic to the Docker Nginx Gateway running on 127.0.0.1:80
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

### Step 5: Automated Container Startup on Reboot

Enable Docker system service so containers start automatically if the VPS restarts:

```bash
sudo systemctl enable docker
sudo systemctl enable containerd
```

---

## 5. Deployment Method 3: Individual / Bare-Metal Process Deployment (PM2 & systemd)

For teams running Node.js services directly on Ubuntu without Docker.

### Step 1: Install System Dependencies (Node 22, pnpm, Postgres, Redis)

```bash
# 1. Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Enable pnpm
sudo corepack enable && sudo corepack prepare pnpm@11.25.0 --activate

# 3. Install PM2 globally
sudo npm install -g pm2

# 4. Install PostgreSQL 16 & Redis 7
sudo apt install -y postgresql postgresql-contrib redis-server
sudo systemctl enable postgresql redis-server
sudo systemctl start postgresql redis-server
```

---

### Step 2: Initialize Database & Media Storage Root

```bash
# Create PostgreSQL user and database
sudo -u postgres psql -c "CREATE USER olx_admin WITH PASSWORD 'StrongPassword123';"
sudo -u postgres psql -c "CREATE DATABASE olx_marketplace OWNER olx_admin;"

# Create media directory with write permissions
sudo mkdir -p /data/olx-media
sudo chown -R $USER:$USER /data/olx-media
sudo chmod -R 775 /data/olx-media
```

---

### Step 3: Configure Individual `.env` Files

Populate the dedicated `.env` file for each sub-project:

1. `packages/database/.env` &rarr; `DATABASE_URL="postgresql://olx_admin:StrongPassword123@localhost:5432/olx_marketplace?schema=public"`
2. `apps/server/.env` &rarr; See [File 3](#file-3-fastify-backend-api-env-appsserverenv)
3. `apps/media-service/.env` &rarr; See [File 4](#file-4-media-microservice-env-appsmedia-serviceenv)
4. `apps/workers/.env` &rarr; See [File 5](#file-5-background-workers-env-appsworkersenv)
5. `apps/client/.env.production` &rarr; `VITE_API_BASE_URL=/api/v1`
6. `apps/admin/.env.production` &rarr; `VITE_BASE_URL=/admin/`

---

### Step 4: Build Monorepo Workspaces in Order

```bash
cd /var/www/olx
pnpm install --frozen-lockfile

# Build packages in topological order
pnpm --filter @olx/database db:generate
pnpm --filter @olx/database build
pnpm --filter @olx/shared build
pnpm --filter @olx/server build
pnpm --filter @olx/media-service build
pnpm --filter @olx/workers build
pnpm --filter @olx/client build
pnpm --filter @olx/admin build
```

---

### Step 5: Run Database Migrations

```bash
pnpm --filter @olx/database db:migrate
pnpm --filter @olx/database db:seed
```

---

### Step 6: Manage Backend Services with PM2

Create `ecosystem.config.cjs` at `/var/www/olx/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'blx-server',
      script: 'apps/server/dist/server.js',
      cwd: '/var/www/olx',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
    {
      name: 'blx-media',
      script: 'apps/media-service/dist/server.js',
      cwd: '/var/www/olx',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 5005,
      },
    },
    {
      name: 'blx-workers',
      script: 'apps/workers/dist/worker.js',
      cwd: '/var/www/olx',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

Start and save PM2 processes:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

### Step 7: Host Nginx Configuration for Bare-Metal

Create `/etc/nginx/sites-available/yourdomain.com.conf`:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 35M;

    # Health Check
    location = /health {
        proxy_pass http://127.0.0.1:5000/api/v1/health;
    }

    # Direct Static Media Disk Serving
    location /media/ {
        alias /data/olx-media/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        add_header Access-Control-Allow-Origin *;
        try_files $uri @media_fallback;
    }

    location @media_fallback {
        proxy_pass http://127.0.0.1:5005;
    }

    # Fastify API Server
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Real-Time WebSocket Gateway
    location /socket.io {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Admin Portal Static Assets
    location ^~ /admin/ {
        alias /var/www/olx/apps/admin/dist/;
        index index.html;
        try_files $uri $uri/ /admin/index.html;
    }

    # Customer Web App Static Assets
    location / {
        root /var/www/olx/apps/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 6. Deployment Method 4: Multi-Server Distributed Cluster

For large-scale, high-concurrency production workloads:

### Server 1: Database & Persistent Storage Node
- **PostgreSQL 16** and **Redis 7** run on an internal private network (e.g. `10.0.0.2`).
- Public ingress is denied by UFW.
- Connect via `postgresql://...:5432` and `redis://...:6379`.

### Server 2: Backend API & Worker Cluster
- Runs **Fastify API Server** and **BullMQ Sharp Workers**.
- Connected to Database Node via private VPC network.
- Scaled horizontally behind an internal load balancer.

### Server 3: Edge Web & CDN
- Runs **Nginx**, **Client Static Build**, and **Admin Portal Static Build**.
- Terminates SSL and delivers static assets directly from disk cache.

---

## 7. Local Media Storage & Persistent Volume Architecture

### High-Performance Direct Disk Serving via Nginx

The platform uses a dedicated **Media Microservice (`apps/media-service`)** and local persistent disk volumes mounted at `/data/olx-media` instead of external S3/MinIO:

1. **Uploads Handling**: Upload requests (`POST /api/v1/uploads?resource=chats` or `/ads/upload-images`) write raw files to `/data/olx-media` and queue a BullMQ job.
2. **Zero-Copy Static Serving**: Public image requests (`/media/...`) are served directly by Nginx from the local `/data/olx-media` persistent volume with 30-day immutable headers (`max-age=2592000, immutable`), bypassing Node.js process overhead entirely.

---

### Shared Docker Volume (`media_data`) Mounting

In `docker-compose.prod.yml`, the `media_data` volume is shared across `server`, `media-service`, `workers`, and `nginx`:

```yaml
volumes:
  postgres_data:
  redis_data:
  media_data:
    driver: local
```

---

## 8. Admin Operations Portal Deployment & Security

### HTTP-Only Cookie Same-Origin Alignment

The Admin Portal uses secure HTTP-only cookies (`admin_access_token` and `admin_refresh_token`). To prevent cross-site cookie blocking by modern browsers:
- Host the Admin Portal on the **same origin** under `/admin/` (e.g. `https://yourdomain.com/admin/`), or on a subdomain (e.g. `https://admin.yourdomain.com`).
- Nginx proxies `/api/` calls seamlessly to Fastify so cookies are transmitted automatically on every request.

---

### IP Whitelisting & Secondary Basic Auth Gate

To protect the admin dashboard from brute-force scanning:

```nginx
# Restrict to VPN / Office IPs inside Nginx location /admin/
location ^~ /admin/ {
    allow 203.0.113.45;    # Office IP
    allow 10.8.0.0/24;      # WireGuard VPN subnet
    deny all;
    ...
}
```

---

## 9. Zero-Downtime Deployment & CI/CD Pipeline

Zero-downtime rolling deployment script (`/var/www/olx/deploy.sh`):

```bash
#!/usr/bin/env bash
set -e

echo "🚀 Starting Zero-Downtime Deployment..."
git pull origin main

# Rebuild and restart services smoothly
docker compose -f docker-compose.prod.yml up -d --build --no-deps server client admin

# Apply database migrations
docker compose -f docker-compose.prod.yml exec -T server npx prisma migrate deploy

# Reload Nginx gateway
docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload

echo "✅ Deployment completed successfully!"
```

---

## 10. Backups, Monitoring & Disaster Recovery

Automated daily backup cron script (`/usr/local/bin/backup-olx.sh`):

```bash
#!/usr/bin/env bash
BACKUP_DIR="/var/backups/olx"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)

# 1. Backup PostgreSQL
docker compose -f /var/www/olx/docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres olx_marketplace | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# 2. Backup Persistent Media Assets
tar -czf "$BACKUP_DIR/media_$DATE.tar.gz" -C /data/olx-media .

# 3. Retain last 7 days of backups
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

Schedule in `crontab -e`:
```text
0 3 * * * /usr/local/bin/backup-olx.sh >> /var/log/olx-backup.log 2>&1
```
