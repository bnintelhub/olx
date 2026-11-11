# BharatMarket (OLX Marketplace) — Production VPS Deployment Strategy

> Comprehensive operations manual for deploying BharatMarket on Linux VPS servers (Ubuntu 22.04 / 24.04 LTS). Covers infrastructure hardening, local persistent volume media storage, Nginx reverse proxy with SSL, domain configurations, and both **Single-VPS (Monorepo)** and **Multi-Server (Distributed)** deployment options.

---

## Table of Contents

- [1. Architecture Topologies](#1-architecture-topologies)
  - [Option A: Single-VPS All-in-One Deployment](#option-a-single-vps-all-in-one-deployment)
  - [Option B: Separate Multi-Server Distributed Deployment](#option-b-separate-multi-server-distributed-deployment)
- [2. Local Media Storage & Persistent Volume Architecture](#2-local-media-storage--persistent-volume-architecture)
  - [High-Performance Direct Disk Serving via Nginx](#high-performance-direct-disk-serving-via-nginx)
  - [Shared Docker Volume (`media_data`) Mounting](#shared-docker-volume-media_data-mounting)
  - [UFW Firewall & Port Security](#ufw-firewall--port-security)
- [3. Domain Architecture & DNS Mapping](#3-domain-architecture--dns-mapping)
- [4. Single-VPS Monorepo Deployment Guide](#4-single-vps-monorepo-deployment-guide)
  - [Step 1: VPS Initial Hardening](#step-1-vps-initial-hardening)
  - [Step 2: Install Docker & Docker Compose](#step-2-install-docker--docker-compose)
  - [Step 3: Clone Repository & Configure Environment](#step-3-clone-repository--configure-environment)
  - [Step 4: Hardened Production Docker Compose](#step-4-hardened-production-docker-compose)
  - [Step 5: Production Nginx Reverse Proxy with SSL](#step-5-production-nginx-reverse-proxy-with-ssl)
  - [Step 6: Database Initialization & Seeding](#step-6-database-initialization--seeding)
  - [Step 7: Launch & Verify Services](#step-7-launch--verify-services)
- [5. Separate / Distributed Deployment Guide](#5-separate--distributed-deployment-guide)
  - [Server 1: Database & Storage Node](#server-1-database--storage-node)
  - [Server 2: Backend API & Worker Cluster](#server-2-backend-api--worker-cluster)
  - [Server 3: Edge Web & CDN (Client & Admin)](#server-3-edge-web--cdn-client--admin)
- [6. Admin Client (Operations Portal) Dedicated Deployment Guide](#6-admin-client-operations-portal-dedicated-deployment-guide)
  - [6.1 Deployment Options for Admin Client](#61-deployment-options-for-admin-client)
  - [6.2 Crucial API & Cookie Routing Configuration](#62-crucial-api--cookie-routing-configuration)
  - [6.3 Admin Portal Security Hardening](#63-admin-portal-security-hardening)
  - [6.4 Initial Super Admin Account Creation](#64-initial-super-admin-account-creation)
- [7. Zero-Downtime Deployment & CI/CD Pipeline](#7-zero-downtime-deployment--cicd-pipeline)
- [8. Backups, Monitoring & Disaster Recovery](#8-backups-monitoring--disaster-recovery)

---

## 1. Architecture Topologies

### Option A: Single-VPS All-in-One Deployment

Ideal for MVP, staging, and initial production workloads (Recommended minimum: **4 vCPU, 8 GB RAM, 80 GB NVMe SSD**):

```mermaid
flowchart TD
    Internet([Public Internet]) -->|HTTPS:443| NGINX[Nginx Reverse Proxy + Let's Encrypt]

    subgraph VPS["Linux VPS (Hetzner / DigitalOcean / AWS EC2)"]
        NGINX -->|yourdomain.com| ClientApp["Client Frontend (React/Vite :5173 / Static)"]
        NGINX -->|admin.yourdomain.com| AdminPortal["Admin Portal (React/Vite :5174 / Static)"]
        NGINX -->|api.yourdomain.com| FastifyAPI["Fastify API Server (:5000)"]
        NGINX -->|/media/| LocalMedia["Direct Disk Serving (/data/olx-media)"]

        subgraph PrivateDockerNet["Isolated Docker Network (bharatmarket_net) - No Public Ports"]
            FastifyAPI -->|Read/Write| Postgres[(PostgreSQL 16 DB)]
            FastifyAPI -->|Cache & PubSub| Redis[(Redis 7)]
            FastifyAPI -->|Push Jobs| BullMQ[BullMQ Queues]
            BullMQ --> Workers["Background Workers (Sharp Engine)"]
            Workers -->|Store WebP Variants| LocalVolume[("Persistent Volume: media_data (/data/olx-media)")]
            FastifyAPI -->|Instant Stage Write| LocalVolume
        end
    end
```

---

### Option B: Separate Multi-Server Distributed Deployment

For high-traffic, horizontally scalable production environments:

```mermaid
flowchart LR
    Users([Marketplace Users]) --> Cloudflare[Cloudflare DNS + WAF + CDN]

    subgraph NodeEdge["Server 1: Edge & Web (2 vCPU, 4GB)"]
        Cloudflare -->|yourdomain.com| EdgeNginx[Nginx Web Server]
        EdgeNginx --> WebApp[Client React App]
        EdgeNginx --> AdminApp[Admin Portal]
    end

    subgraph NodeApp["Server 2: App & Workers (4-8 vCPU, 8-16GB)"]
        Cloudflare -->|api.yourdomain.com| AppNginx[Nginx API Gateway]
        AppNginx --> API1[Fastify API Instance 1]
        AppNginx --> API2[Fastify API Instance 2]
        WorkerGroup[Worker Cluster] --> BullMQQueue[BullMQ Worker Processes]
    end

    subgraph NodeData["Server 3: Database & Storage Node (4 vCPU, 16GB)"]
        PostgresDB[(PostgreSQL Primary)]
        RedisCluster[(Redis 7 In-Memory)]
        SharedStorage[(Shared NVMe / NFS Volume)]
        Cloudflare -->|media.yourdomain.com| MediaNginx[Nginx Direct Static Engine]
        MediaNginx --> SharedStorage
    end

    API1 --> PostgresDB
    API2 --> PostgresDB
    API1 --> RedisCluster
    API2 --> RedisCluster
    WorkerGroup --> RedisCluster
    WorkerGroup --> SharedStorage
```

---

## 2. Local Media Storage & Persistent Volume Architecture

### High-Performance Direct Disk Serving via Nginx

The platform uses a dedicated **Media Microservice (`apps/media-service`)** and local persistent disk volumes mounted at `/data/olx-media` instead of external S3/MinIO.

1. **Uploads Handling**: Upload requests (`POST /media/images?resource=ads`) are processed by the internal Fastify Media Service (`:5005`), which validates magic bytes and writes raw files to disk before pushing an optimization job to BullMQ.
2. **Zero-Copy Static Serving**: Public image requests are served directly by Nginx from the local `/data/olx-media` persistent volume with immutable caching headers, bypassing Node.js process overhead entirely.

> [!IMPORTANT]
> **Production Rule**: The media microservice port (`5005`), database port (`5432`), and Redis port (`6379`) must **never** be exposed to `0.0.0.0` or open in the VPS firewall (`ufw`). Only ports `80` (HTTP) and `443` (HTTPS) should accept public traffic.

---

### Shared Docker Volume (`media_data`) Mounting

In your production `docker-compose.prod.yml`, the persistent `media_data` volume is shared across the `media-service`, `workers`, and Nginx:

```yaml
volumes:
  postgres_data:
  redis_data:
  media_data:

services:
  media-service:
    build:
      context: .
      dockerfile: ./infrastructure/docker/Dockerfile.media
    container_name: bm_media_service
    restart: unless-stopped
    ports:
      - "127.0.0.1:5005:5005"
    environment:
      NODE_ENV: production
      PORT: 5005
      MEDIA_ROOT: "/data/olx-media"
      MEDIA_PUBLIC_BASE_URL: "https://yourdomain.com/media"
    volumes:
      - media_data:/data/olx-media
    networks:
      - bharatmarket_net
```

#### Firewall (`ufw`) Configuration on the VPS Host:
```bash
# Default policies: Deny incoming, Allow outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow only SSH, HTTP, and HTTPS
sudo ufw allow 22/tcp comment 'Secure SSH'
sudo ufw allow 80/tcp comment 'HTTP Let’s Encrypt challenge'
sudo ufw allow 443/tcp comment 'HTTPS Public Traffic'

# Explicitly ensure internal ports are blocked externally
sudo ufw deny 5005/tcp
sudo ufw deny 5000/tcp
sudo ufw deny 5432/tcp
sudo ufw deny 5433/tcp
sudo ufw deny 6379/tcp

sudo ufw enable
sudo ufw status verbose
```

---

### Secure Public Media Routing via Nginx

Public users only download processed images (e.g. `https://media.yourdomain.com/ads/images/large.webp` or `https://yourdomain.com/media/...`). We configure Nginx to serve static assets directly from disk with aggressive caching:

```nginx
# /etc/nginx/sites-available/media.yourdomain.com.conf

server {
    listen 80;
    server_name media.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name media.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Access-Control-Allow-Origin "*" always;

    # Limit methods on public media domain: Only GET and HEAD allowed!
    if ($request_method !~ ^(GET|HEAD)$) {
        return 405;
    }

    # Direct static file serving from persistent volume with immutable caching
    location / {
        alias /var/lib/docker/volumes/bharatmarket_media_data/_data/;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        etag on;
        try_files $uri =404;
    }
}
```

---

## 3. Domain Architecture & DNS Mapping

Configure these DNS records at your domain registrar / DNS provider (Cloudflare, Namecheap, GoDaddy):

| Type | Name / Subdomain | Target / Value | Purpose |
|:---|:---|:---|:---|
| `A` | `@` (or `www`) | `YOUR_VPS_IP` | Marketplace Client Web App (`https://yourdomain.com`) |
| `A` | `admin` | `YOUR_VPS_IP` | Admin Operations Portal (`https://admin.yourdomain.com`) |
| `A` | `api` | `YOUR_VPS_IP` | Fastify REST API & Clustered Socket.IO (`https://api.yourdomain.com`) |
| `A` | `media` | `YOUR_VPS_IP` | Media CDN / Static Content Delivery (`https://media.yourdomain.com`) |

---

## 4. Single-VPS Monorepo Deployment Guide

### Step 1: VPS Initial Hardening

1. **Update system packages:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git ufw fail2ban certbot python3-certbot-nginx htop
   ```

2. **Configure Fail2Ban (SSH protection):**
   ```bash
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

3. **Create 4 GB Swap space (Prevents OOM during builds):**
   ```bash
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

---

### Step 2: Install Docker & Docker Compose

```bash
# Install official Docker CE
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version && docker compose version
```

---

### Step 3: Clone Repository & Configure Environment

```bash
# Create deploy directory
sudo mkdir -p /var/www/bharatmarket
sudo chown -y $USER:$USER /var/www/bharatmarket
cd /var/www/bharatmarket

# Clone repository
git clone https://github.com/bnintelhub/olx.git .

# Create production environment file
cp .env.example .env.production
nano .env.production
```

#### Production `.env.production` Configuration:
```env
# ==========================================
# BHARATMARKET PRODUCTION ENVIRONMENT
# ==========================================
NODE_ENV=production
PORT=5000

# DOMAINS
CLIENT_URL=https://yourdomain.com
ADMIN_URL=https://admin.yourdomain.com
API_URL=https://api.yourdomain.com

# DATABASE & CACHE
DB_USER=olx_prod_user
DB_PASSWORD=UseVeryStrongPasswordGeneratedWithOpenSSL_64chars
DB_NAME=olx_marketplace_prod
DATABASE_URL=postgresql://olx_prod_user:UseVeryStrongPasswordGeneratedWithOpenSSL_64chars@postgres:5432/olx_marketplace_prod?schema=public
REDIS_URL=redis://redis:6379

# AUTHENTICATION SECRETS (Generate with: openssl rand -hex 32)
JWT_ACCESS_SECRET=c1f4e8b9392c6b4123a6f194bd8293758b9192305a81239c8120394857b29381
JWT_REFRESH_SECRET=7f82910394b291048291a0c82930492819230948b81923049812930498129304

# LOCAL MEDIA STORAGE (Self-Managed Volume)
MEDIA_ROOT=/data/olx-media
MEDIA_PUBLIC_BASE_URL=https://media.yourdomain.com
MEDIA_SERVICE_PORT=5005
MEDIA_SERVICE_URL=http://media-service:5005

# SMS GATEWAY (e.g. FAST2SMS / TWILIO / MSG91)
SMS_PROVIDER=FAST2SMS
FAST2SMS_API_KEY=your_actual_sms_gateway_api_key
```

---

### Step 4: Hardened Production Docker Compose

Create `/var/www/bharatmarket/docker-compose.prod.yml`:

```yaml
version: '3.8'

networks:
  bharatmarket_net:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  media_data:

services:
  # PostgreSQL 16 (No public ports!)
  postgres:
    image: postgres:16-alpine
    container_name: bm_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - bharatmarket_net

  # Redis 7 (No public ports!)
  redis:
    image: redis:7-alpine
    container_name: bm_redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - bharatmarket_net

  # Media Microservice (Uploads & Local Storage Engine)
  media-service:
    build:
      context: .
      dockerfile: ./infrastructure/docker/dev/Dockerfile.media
    container_name: bm_media_service
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "127.0.0.1:5005:5005"
    environment:
      NODE_ENV: production
      PORT: 5005
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      MEDIA_ROOT: ${MEDIA_ROOT}
      MEDIA_PUBLIC_BASE_URL: ${MEDIA_PUBLIC_BASE_URL}
    volumes:
      - media_data:/data/olx-media
    networks:
      - bharatmarket_net

  # Backend Fastify API (Bound only to 127.0.0.1 for Nginx)
  server:
    build:
      context: .
      dockerfile: ./infrastructure/docker/dev/Dockerfile.server
    container_name: bm_server
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      media-service:
        condition: service_started
    env_file:
      - .env.production
    ports:
      - "127.0.0.1:5000:5000"
    networks:
      - bharatmarket_net

  # Admin Operations Client (React + Vite + Nginx)
  admin:
    build:
      context: .
      dockerfile: ./infrastructure/docker/dev/Dockerfile.admin
    container_name: bm_admin
    restart: unless-stopped
    depends_on:
      - server
    ports:
      - "127.0.0.1:5174:80"
    networks:
      - bharatmarket_net

  # Client Marketplace Web App (React + Vite PWA + Nginx)
  client:
    build:
      context: .
      dockerfile: ./infrastructure/docker/dev/Dockerfile.client
    container_name: bm_client
    restart: unless-stopped
    depends_on:
      - server
    ports:
      - "127.0.0.1:5173:80"
    networks:
      - bharatmarket_net

  # BullMQ Image Optimization & OTP Workers
  workers:
    build:
      context: .
      dockerfile: ./infrastructure/docker/dev/Dockerfile.worker
    container_name: bm_workers
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      media-service:
        condition: service_started
    volumes:
      - media_data:/data/olx-media
    env_file:
      - .env.production
    networks:
      - bharatmarket_net
```

---

### Step 5: Production Nginx Reverse Proxy with SSL

Install Nginx and obtain free automatic SSL certificates via Let's Encrypt:

```bash
# Obtain multi-domain SSL certificates
sudo certbot certonly --nginx \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com \
  -d admin.yourdomain.com \
  -d media.yourdomain.com
```

Create unified Nginx configuration at `/etc/nginx/sites-available/bharatmarket.conf`:

```nginx
# ========================================================
# 1. API & REAL-TIME SOCKET.IO BACKEND (api.yourdomain.com)
# ========================================================
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for Socket.IO
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}

# ========================================================
# 2. MEDIA STATIC DELIVERY & MICROSERVICE (media.yourdomain.com)
# ========================================================
server {
    listen 80;
    server_name media.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name media.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Restrict to GET and HEAD only (Prevents public write)
    if ($request_method !~ ^(GET|HEAD)$) {
        return 405;
    }

    # High-Performance Direct Disk Serving from persistent volume
    location / {
        alias /var/lib/docker/volumes/bharatmarket_media_data/_data/;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        etag on;
        try_files $uri @media_service;
    }

    location @media_service {
        proxy_pass http://127.0.0.1:5005;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ========================================================
# 3. CLIENT MARKETPLACE WEB APP (yourdomain.com)
# ========================================================
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

    root /var/www/bharatmarket/apps/client/dist;
    index index.html;

    # SPA routing: fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static frontend bundles
    location ~* \.(js|css|webp|png|jpg|jpeg|gif|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}

# ========================================================
# 4. ADMIN OPERATIONS PORTAL (admin.yourdomain.com)
# ========================================================
server {
    listen 80;
    server_name admin.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /var/www/bharatmarket/apps/admin/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy all backend API calls to Fastify (Maintains admin cookies)
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket connection for Real-Time Chat Moderation
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # SPA routing fallback for React Router
    location / {
        # Option A: When serving static files on host:
        try_files $uri $uri/ /index.html;

        # Option B: When running Dockerized Admin container:
        # proxy_pass http://127.0.0.1:5174;
    }

    # Cache static admin bundles
    location ~* \.(js|css|webp|png|jpg|jpeg|gif|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

Enable site and test Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/bharatmarket.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

### Step 6: Database Initialization & Seeding

Build frontend assets and seed database:
```bash
# Build client and admin distribution packages
cd /var/www/bharatmarket
pnpm install
pnpm --filter @olx/database db:generate
pnpm --filter @olx/database build
pnpm --filter @olx/shared build
pnpm --filter @olx/client build
pnpm --filter @olx/admin build

# Boot database, cache, and media service containers first
docker compose -f docker-compose.prod.yml up -d postgres redis media-service

# Push Prisma schemas and seed database
docker compose -f docker-compose.prod.yml exec -T server pnpm --filter @olx/database db:push
docker compose -f docker-compose.prod.yml exec -T server pnpm --filter @olx/database db:seed
```

---

### Step 7: Launch & Verify Services

```bash
# Boot the entire stack
docker compose -f docker-compose.prod.yml up -d --build

# Verify container health
docker compose -f docker-compose.prod.yml ps

# Check API health endpoint
curl -i https://api.yourdomain.com/api/v1/health
```

Expected Health Check Output:
```json
{
  "status": "healthy",
  "timestamp": "2026-11-09T...",
  "service": "olx-fastify-backend",
  "database": { "type": "PostgreSQL 16 (Docker)", "status": "connected" },
  "redis": { "type": "Redis 7 (Docker)", "status": "connected" }
}
```

---

## 5. Separate / Distributed Deployment Guide

For high scale, split components across dedicated machines:

### Server 1: Database & Storage Node (`db-node.internal`)
- Runs **PostgreSQL 16**, **Redis 7**, and **Local Media Storage Volume** (`/data/olx-media`).
- Bound strictly to internal private VPC subnet (e.g., `10.0.0.x`).
- UFW blocks all public inbound traffic except SSH.
- `media.yourdomain.com` runs Nginx with direct static disk serving and aggressive caching.

### Server 2: Backend API & Worker Cluster (`app-node.internal`)
- Runs multiple instances of `Fastify API` load-balanced via Nginx upstream.
- Runs `BullMQ Background Workers` to process Sharp image optimization without stealing CPU cycles from the API.
- Connects to Server 1 over internal wireguard or VPC private IP (`10.0.0.5:5432`).

### Server 3: Edge Web & CDN (Client & Admin)
- Static client React app and admin portal hosted on edge CDN (Cloudflare Pages / Vercel / Nginx Edge Node).
- All API requests point to `https://api.yourdomain.com`.
- All images load from `https://media.yourdomain.com`.

---

## 6. Admin Client (Operations Portal) Dedicated Deployment Guide

The Admin Portal (`apps/admin`) is built with React 18, Vite, TanStack Table & Query, Lucide icons, and Tailwind CSS. It connects to the Fastify backend via HTTP-only cookie authentication (`admin_access_token` and `admin_refresh_token`) and uses the request header `X-App-Context: admin`.

### 6.1 Deployment Options for Admin Client

#### Option 1: Docker Containerized (Recommended for Monorepo VPS)
In `docker-compose.prod.yml`, the admin portal is containerized with a lightweight Nginx Alpine image:
```bash
# Build and run the admin container on 127.0.0.1:5174
docker compose -f docker-compose.prod.yml up -d --build admin
```
Host Nginx reverse proxies `https://admin.yourdomain.com` to `http://127.0.0.1:5174`.

#### Option 2: Host Nginx Static Serving
Directly compile the production build on the VPS:
```bash
pnpm --filter @olx/admin build
```
Static artifacts output to `/var/www/bharatmarket/apps/admin/dist/`. Host Nginx serves this folder with `root /var/www/bharatmarket/apps/admin/dist; index index.html; try_files $uri $uri/ /index.html;`.

#### Option 3: Isolated Cloudflare Pages / Vercel Edge Deployment
For heightened security, host the admin dashboard completely outside the VPS on Cloudflare Pages:
1. Connect the GitHub repo to Cloudflare Pages.
2. Root directory: `apps/admin`.
3. Build command: `pnpm build`.
4. Output directory: `dist`.
5. Set custom domain: `admin.yourdomain.com`.

---

### 6.2 Crucial API & Cookie Routing Configuration
The admin frontend `apiClient` (`apps/admin/src/lib/api-client.ts`) uses relative baseURL `'/api/v1'` with `withCredentials: true`. Therefore, Nginx **must** proxy `/api/` calls to the Fastify backend to ensure same-origin cookies work smoothly:

```nginx
    # Route all API traffic to Fastify backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Real-Time WebSocket for Chat Moderation & Instant Alerts
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
```

---

### 6.3 Admin Portal Security Hardening

To protect the admin dashboard from brute-force scanning and automated bot attacks:

#### 1. IP Whitelisting (Restrict Access to Office / VPN IP):
Add an `allow` directive inside the Nginx `server` block for `admin.yourdomain.com`:
```nginx
    # Allow only specific corporate / home / VPN IPs
    allow 203.0.113.45;       # Your static office IP
    allow 10.8.0.0/24;         # Wireguard / Tailscale VPN subnet
    deny all;                  # Block everyone else
```

#### 2. HTTP Basic Auth Gate (Secondary Password Gate):
Add an HTTP Basic Auth gate before anyone can see the admin login UI:
```bash
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd admin_staff
```
In Nginx configuration:
```nginx
    auth_basic "BharatMarket Staff Operations Only";
    auth_basic_user_file /etc/nginx/.htpasswd;
```

---

### 6.4 Initial Super Admin Account Creation

To seed the initial administrative accounts with full privileges (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `FINANCE_ADMIN`):

```bash
# Execute roles seed script inside backend container
docker compose -f docker-compose.prod.yml exec -T server pnpm --filter @olx/database run db:seed:roles
```

Default credentials created:
- **Email**: `superadmin@gmail.com`
- **Password**: `superAdmin@123`
- **Role**: `SUPER_ADMIN` (Full wildcard permissions)

> [!IMPORTANT]
> Immediately change the default admin credentials after initial login through the Admin Settings menu!

---

## 7. Zero-Downtime Deployment & CI/CD Pipeline

To deploy new code updates without interrupting user sessions, use this rolling update script `/var/www/bharatmarket/deploy.sh`:

```bash
#!/usr/bin/env bash
set -e

echo "🚀 [Deploy] Pulling latest changes from git..."
cd /var/www/bharatmarket
git fetch origin main
git reset --hard origin/main

echo "📦 [Deploy] Building internal packages..."
pnpm install --frozen-lockfile
pnpm --filter @olx/database db:generate
pnpm --filter @olx/database build
pnpm --filter @olx/shared build

echo "🗄️ [Deploy] Running database migrations..."
pnpm --filter @olx/database db:push

echo "🎨 [Deploy] Building static frontend bundles..."
pnpm --filter @olx/client build
pnpm --filter @olx/admin build

echo "🔄 [Deploy] Rebuilding backend and worker containers..."
docker compose -f docker-compose.prod.yml build server workers
docker compose -f docker-compose.prod.yml up -d --no-deps --remove-orphans server workers

echo "🧹 [Deploy] Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ [Deploy] Deployment finished successfully!"
```

Make executable:
```bash
chmod +x /var/www/bharatmarket/deploy.sh
```

---

## 8. Backups, Monitoring & Disaster Recovery

### Automated PostgreSQL Nightly Backup Cron

Create `/etc/cron.daily/backup-postgres.sh`:

```bash
#!/usr/bin/env bash
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Execute pg_dump from docker container
docker exec -t bm_postgres pg_dump -U olx_prod_user olx_marketplace_prod | gzip > "$BACKUP_DIR/olx_backup_$DATE.sql.gz"

# Keep last 14 days of backups
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +14 -delete
```

Make executable:
```bash
sudo chmod +x /etc/cron.daily/backup-postgres.sh
```

### Persistent Media Volume Offsite Disaster Backup

To replicate images from the persistent media volume to an off-site S3-compatible cloud storage (e.g. AWS S3, Cloudflare R2, Backblaze B2, or secondary backup server), install `rclone`:

```bash
# Sync local media volume directly to remote offsite backup
sudo rclone sync /var/lib/docker/volumes/bharatmarket_media_data/_data remote-backup:bharatmarket-media-backup/ \
  --transfers 8 \
  --checkers 16 \
  --fast-list \
  --log-file=/var/log/rclone-media-backup.log
```

