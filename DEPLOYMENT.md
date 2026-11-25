# BharatMarket (OLX Orbit) — Production Deployment Guide

> Step-by-step production deployment manual for engineers deploying BharatMarket on Linux VPS instances (Ubuntu 22.04 / 24.04 LTS, Debian, or Docker-compatible hosts).

---

## 1. Production Architecture Overview

BharatMarket runs on a containerized stack orchestrated via **Docker Compose** (`docker-compose.prod.yml`), tuned for a single VPS paired with an **external managed PostgreSQL** database (e.g., Neon DB, Hostinger Managed PostgreSQL, or AWS RDS):

- **Nginx Gateway (`nginx`)**: Unified reverse proxy listening on ports `80` (ACME challenge + `/health` + `301` redirect to HTTPS) and `443` (TLS 1.2/1.3 + HTTP/2 + HSTS). Routes `/api/*`, `/socket.io`, and SSE streams to `server`, `/media/*` directly from disk, `/admin/*` to Admin SPA, and `/` to Client SPA. Ships with a fallback self-signed certificate so the container starts immediately before real domain SSL certs are mounted.
- **Backend API (`server`)**: Fastify 5 REST API + Clustered Socket.IO server running on internal port `5000`.
- **Background Workers (`workers`)**: BullMQ worker service processing Sharp WebP image variants, OTP dispatches, push notifications, and Phase 1 Feed/Recommendation events.
- **Client Web App (`client`)**: Production React 18 SPA served via Nginx.
- **Admin Portal (`admin`)**: Production React 18 Admin Operations portal served via Nginx at `/admin/`.
- **Redis 7 (`redis`)**: In-memory cache, BullMQ queue store, and Socket.IO cluster adapter configured with `--appendonly yes --maxmemory 512mb --maxmemory-policy noeviction` so queued jobs and pub/sub messages are never silently evicted.
- **PostgreSQL (`postgres` — Optional Profile)**: External cloud PostgreSQL is used by default (zero DB CPU/RAM load on your VPS). A containerized PostgreSQL 16 service is available only when explicitly enabled via `--profile local-db`.

---

## 2. Directory & Configuration Structure

All environment configuration and Docker Compose files live at the **repository root**:

```text
olx/
├── .env.development           # Local development environment secrets
├── .env.development.example   # Development template
├── .env.production            # Production environment secrets (DO NOT COMMIT)
├── .env.production.example    # Production template
├── docker-compose.dev.yml     # Local development compose stack
├── docker-compose.prod.yml    # Production compose stack (External DB default)
└── infrastructure/
    ├── docker/prod/           # Production multi-stage Dockerfiles (incl. Dockerfile.nginx)
    └── nginx/                 # Gateway configs (nginx.conf, nginx.prod.conf) & optional ssl/
```

---

## 3. Step-by-Step Production Deployment

### Step 1: Install Docker & Configure VPS Firewall
If Docker is not already installed on your VPS:

```bash
sudo apt-get update && sudo apt-get install -y curl git ca-certificates gnupg
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

Ensure your VPS firewall (UFW / Cloud Panel) allows only required public ports:
- **Open**: `22` (SSH), `80` (HTTP redirect & Let's Encrypt ACME), `443` (HTTPS)
- **Closed externally**: `5000` (API), `6379` (Redis), `5432` (PostgreSQL)

Recommended minimum VPS sizing with external DB + 512 MB Redis: **2 vCPU / 4 GB RAM** (2 GB RAM works for light traffic).

---

### Step 2: Clone Codebase

```bash
git clone https://github.com/your-org/olx-marketplace.git /var/www/olx
cd /var/www/olx
```

---

### Step 3: Configure `.env.production`

Copy the production template and edit it:

```bash
cp .env.production.example .env.production
nano .env.production
```

#### Required Variables to Update:

1. **Primary Domain (`APP_URL`)**:
   ```env
   APP_URL=https://olx.bnorbit.tech
   ```
   *(Sub-paths for `/admin`, `/api`, `/media`, and callbacks derive from `APP_URL` unless overridden by `CLIENT_URL` / `ADMIN_URL`.)*

2. **Database Connection (`DATABASE_URL`)**:
   - **External Managed Postgres (Neon DB / Hostinger / RDS — Recommended)**:
     ```env
     DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public&connection_limit=15&pool_timeout=20&sslmode=require"
     ```
     *(Note: `schema.prisma` reads `DATABASE_URL`. When running `prisma migrate deploy` against Neon, ensure the target connection supports advisory locks, or temporarily use the direct non-pooler Neon host for migrations.)*
   - **Self-Hosted Postgres inside Docker (`--profile local-db` only)**:
     ```env
     POSTGRES_DB=olx_marketplace
     POSTGRES_USER=postgres
     POSTGRES_PASSWORD=YourStrongDatabasePassword2026!
     DATABASE_URL="postgresql://postgres:YourStrongDatabasePassword2026!@postgres:5432/olx_marketplace?schema=public&connection_limit=15&pool_timeout=20"
     ```

3. **Generate Secure JWT Secrets**:
   Run `openssl rand -hex 32` twice and paste the outputs:
   ```env
   JWT_ACCESS_SECRET=your_generated_access_secret_hex_32
   JWT_REFRESH_SECRET=your_generated_refresh_secret_hex_32
   ```

4. **Security, Feed & Integrations**:
   - `ENABLE_RATE_LIMIT=true`
   - `SMS_PROVIDER=MSG91` or `TWILIO` (avoid `MOCK` in live production)
   - PayU keys (`PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, `PAYU_WEBHOOK_SECRET`, `PAYU_ENVIRONMENT=production`)
   - Firebase Web Push credentials (`FIREBASE_*`, `VITE_FIREBASE_VAPID_KEY`)
   - Optional Phase 1 Feed flags (`FEED_PERSONALIZATION_ENABLED=true`, `FEED_ROLLOUT_PERCENT=100`, `FEED_EVENT_SHADOW_MODE=false`, `FEED_VERSION=v1`)

---

### Step 4: DNS & SSL Setup (`https://yourdomain.com`)

1. **DNS**: Point an `A` record for your domain/subdomain (e.g., `olx.bnorbit.tech`) to your VPS public IPv4 address.
2. **Nginx `server_name`** (optional, recommended): In `infrastructure/nginx/nginx.prod.conf`, you can replace `server_name _;` (lines 37 and 65) with `server_name olx.bnorbit.tech;`.
3. **SSL Certificates**:
   - `Dockerfile.nginx` generates a fallback self-signed cert at `/etc/nginx/ssl/{fullchain.pem,privkey.pem}` so the stack boots immediately.
   - For trusted browser HTTPS, place your Let's Encrypt or Cloudflare Origin certificates (`fullchain.pem` and `privkey.pem`) in `./infrastructure/nginx/ssl/` on the VPS, and uncomment line 154 in `docker-compose.prod.yml`:
     ```yaml
     - ./infrastructure/nginx/ssl:/etc/nginx/ssl:ro
     ```

---

### Step 5: Build & Launch Containers

```bash
# Default: External PostgreSQL (Neon / Hostinger / Cloud DB)
docker compose -f docker-compose.prod.yml up -d --build

# Optional: Include containerized PostgreSQL on the same VPS
docker compose -f docker-compose.prod.yml --profile local-db up -d --build
```

Monitor startup logs:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

---

### Step 6: Database Migrations & Initial Seeding

Once `server` is running, apply Prisma migrations safely and seed initial data:

```bash
# Apply production migrations
docker compose -f docker-compose.prod.yml exec server pnpm db:migrate:deploy

# Seed categories, locations, and staff RBAC roles
docker compose -f docker-compose.prod.yml exec server pnpm db:seed
docker compose -f docker-compose.prod.yml exec server pnpm db:seed:roles
```

---

### Step 7: Verify Deployment Health

Port `80` redirects all routes except `/health` and `/.well-known/acme-challenge/` to HTTPS (`443`). Verify using:

```bash
# HTTP liveness probe (no redirect on /health)
curl -i http://localhost/health

# HTTPS health & API check (-k ignores self-signed cert if real SSL is not mounted yet)
curl -ik https://localhost/health
curl -ik https://localhost/api/v1/categories
```

Expected `/health` output:
```json
HTTP/1.1 200 OK
{"status":"ok","timestamp":"..."}
```

---

## 4. Media Storage & Delivery Architecture

BharatMarket uses a **Local Persistent Docker Volume** (`media_data:/data/olx-media`):
- **Single Source of Truth**: The database stores only relative file paths (`ads/drafts/...`, `categories/...`). The API returns `/media/${filepath}` and frontends render it directly.
- **Dual-Tier Serving**:
  1. Nginx serves `/media/*` directly from `/data/olx-media/` using kernel `sendfile` with 30-day immutable caching.
  2. Internal directories (`/media/temp/`, `quarantine/`, `trash/`, `failed/`) are blocked with `403`.
  3. If a file is not yet on disk, Nginx falls back to `@media_backend` (`server:5000`), where Fastify streams it.

---

## 5. Provisioning Let's Encrypt SSL on the VPS

If you do not use Cloudflare Origin Certificates, generate Let's Encrypt certificates on the VPS host and copy them into `./infrastructure/nginx/ssl/`:

```bash
# 1. Install Certbot on the VPS
sudo apt-get install -y certbot

# 2. Obtain certificate (use --standalone if port 80 is stopped, or webroot if mapped)
docker compose -f docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone -d olx.bnorbit.tech

# 3. Copy certs into the repo's mounted SSL folder
mkdir -p /var/www/olx/infrastructure/nginx/ssl
sudo cp /etc/letsencrypt/live/olx.bnorbit.tech/fullchain.pem /var/www/olx/infrastructure/nginx/ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/olx.bnorbit.tech/privkey.pem /var/www/olx/infrastructure/nginx/ssl/privkey.pem
sudo chmod 644 /var/www/olx/infrastructure/nginx/ssl/fullchain.pem
sudo chmod 600 /var/www/olx/infrastructure/nginx/ssl/privkey.pem

# 4. Ensure line 154 in docker-compose.prod.yml is uncommented, then restart nginx
docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
```

---

## 6. Maintenance & Zero-Downtime Updates

### Deploying Code Updates

```bash
cd /var/www/olx

# Pull latest changes
git pull origin main

# Rebuild and recreate updated containers
docker compose -f docker-compose.prod.yml up -d --build

# Apply any new Prisma migrations safely
docker compose -f docker-compose.prod.yml exec server pnpm db:migrate:deploy
```

### Viewing Logs & Restarting Services

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Individual services
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f workers
docker compose -f docker-compose.prod.yml logs -f nginx

# Restart API and workers
docker compose -f docker-compose.prod.yml restart server workers
```
