# BharatMarket (OLX Orbit) — Production Deployment Guide

> Step-by-step production deployment manual for engineers deploying BharatMarket on Linux VPS instances (Ubuntu 22.04 / 24.04 LTS, Debian, or Docker-compatible hosts).

---

## 1. Architecture Overview

BharatMarket runs on a containerized micro-service stack orchestrated via **Docker Compose**:

- **Nginx Gateway (`nginx`)**: Unified reverse proxy listening on port 80 & 443. Routes `/api/*` and `/socket.io` to backend, `/media/*` directly to disk, `/admin/*` to Admin SPA, and `/` to Client SPA.
- **Backend API (`server`)**: Fastify 5 REST API + Socket.IO server running on port 5000.
- **Background Workers (`workers`)**: BullMQ worker service processing Sharp WebP image conversions, OTP dispatches, and push notifications.
- **Client Web App (`client`)**: Production React 18 SPA served via Nginx.
- **Admin Portal (`admin`)**: Production React 18 Admin Operations portal served via Nginx.
- **Redis (`redis`)**: In-memory cache, BullMQ queue store, and Socket.IO cluster adapter with AOF persistence.
- **PostgreSQL (`postgres`)**: PostgreSQL 16 database (or external serverless database such as Neon DB).

---

## 2. Directory & Configuration Structure

All environment configuration and Docker Compose files are located **strictly at the repository root**:

```text
olx/
├── .env.development           # Local development environment secrets
├── .env.development.example   # Development template
├── .env.production            # Production environment secrets (DO NOT COMMIT)
├── .env.production.example    # Production template
├── docker-compose.dev.yml     # Local development compose stack
├── docker-compose.prod.yml    # Production compose stack
└── infrastructure/
    ├── docker/prod/           # Production multi-stage Dockerfiles
    └── nginx/                 # Gateway configs (nginx.conf, nginx.prod.conf, nginx.dev.conf)
```

---

## 3. Step-by-Step Production Deployment

### Step 1: Install Docker on your VPS
If Docker is not already installed on your server:

```bash
# Update packages
sudo apt-get update && sudo apt-get install -y curl git ca-certificates gnupg

# Install official Docker engine & Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Re-login or run:
newgrp docker
```

---

### Step 2: Clone Codebase

```bash
git clone https://github.com/your-org/olx-marketplace.git /var/www/olx
cd /var/www/olx
```

---

### Step 3: Configure `.env.production`

Copy the production example file to `.env.production`:

```bash
cp .env.production.example .env.production
nano .env.production
```

#### Required Variables to Update:

1. **Domain URLs**:
   ```env
   CLIENT_URL=https://yourdomain.com
   ADMIN_URL=https://yourdomain.com/admin
   SERVER_URL=https://yourdomain.com
   ```
2. **Database Connection (`DATABASE_URL`)**:
   - **If using Neon DB / AWS RDS / External Postgres**:
     ```env
     DATABASE_URL="postgresql://user:password@ep-host.region.aws.neon.tech/neondb?sslmode=require"
     ```
   - **If using self-hosted Postgres in Docker Compose**:
     ```env
     POSTGRES_DB=olx_marketplace
     POSTGRES_USER=postgres
     POSTGRES_PASSWORD=YourStrongDatabasePassword2026!
     DATABASE_URL="postgresql://postgres:YourStrongDatabasePassword2026!@postgres:5432/olx_marketplace?schema=public"
     ```
3. **Generate Secure JWT Secrets**:
   Run `openssl rand -hex 32` twice and paste the results:
   ```env
   JWT_ACCESS_SECRET=your_generated_access_secret_hex_32
   JWT_REFRESH_SECRET=your_generated_refresh_secret_hex_32
   ```
4. **PayU Payment Keys**:
   Set `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, and `PAYU_ENVIRONMENT=production`.
5. **Firebase Web Push**:
   Confirm your Firebase project ID, credentials, and `VITE_FIREBASE_VAPID_KEY`.

---

### Step 4: Build & Launch Containers

Launch all production containers in detached mode:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

To monitor build and launch progress:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

---

### Step 5: Database Migrations & Initial Data Seeding

Once the containers are running, execute database migrations and initialize seed data:

```bash
# Push Prisma schema migrations to the production database
docker compose -f docker-compose.prod.yml exec server pnpm db:push

# Seed categories, locations, system defaults, and initial Super Admin
docker compose -f docker-compose.prod.yml exec server pnpm db:seed
```

---

### Step 6: Verify Deployment Health

Test that the services are online and responding:

```bash
# Health Check Endpoint
curl -i http://localhost/health

# Verify API
curl -i http://localhost/api/v1/categories
```

Expected output:
```json
HTTP/1.1 200 OK
{"status":"ok"}
```

---

## 4. Setting Up SSL (HTTPS) with Let's Encrypt / Certbot

In production, run Certbot on the host to generate SSL certificates for your domain:

```bash
# 1. Install Certbot
sudo apt-get install -y certbot

# 2. Issue Certificate using Webroot (Nginx proxies /.well-known/acme-challenge/ automatically)
sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com -d www.yourdomain.com

# 3. Mount certificate path in docker-compose.prod.yml under nginx service:
#    - /etc/letsencrypt:/etc/letsencrypt:ro
```

---

## 5. Maintenance & Updates

### Deploying New Code (Zero Downtime Updates)

```bash
cd /var/www/olx

# Pull latest changes
git pull origin main

# Rebuild and restart modified services
docker compose -f docker-compose.prod.yml up -d --build

# Run schema migrations if schema changed
docker compose -f docker-compose.prod.yml exec server pnpm db:push
```

### Viewing Logs

```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Server API only
docker compose -f docker-compose.prod.yml logs -f server

# BullMQ Workers only
docker compose -f docker-compose.prod.yml logs -f workers

# Nginx Gateway only
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Restarting Services

```bash
docker compose -f docker-compose.prod.yml restart server workers
```

