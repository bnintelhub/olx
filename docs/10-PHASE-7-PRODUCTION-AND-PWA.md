# Phase 7: Production Hardening, PWA & Deployment Guide

## 1. Overview
OLX ORBIT (OLX India Classifieds Marketplace) is built as a cloud-native, high-performance classifieds application designed for the Indian market. The architecture follows a multi-tier design:
- **Client Layer**: React 18 + Vite Progressive Web App (PWA) with offline caching and native app-like experience.
- **Web Server / Reverse Proxy**: Nginx Alpine with gzip compression, HTTP security headers, static asset caching, and SPA fallback routing.
- **Application Server**: Node.js 20 LTS + Express + TypeScript with Prisma ORM and Socket.IO for real-time buyer-seller chat.
- **Database**: Local MySQL 8.4 Community Server with native connection pooling, dynamic JSON attributes, and full-text indexes.

---

## 2. Progressive Web App (PWA) Architecture

### 2.1 Manifest Configuration (`frontend/public/manifest.json`)
- **Theme Color**: `#002f34` (Signature OLX Teal)
- **Background Color**: `#ffffff`
- **Display Mode**: `standalone` (Full-screen mobile app shell without browser URL bars)
- **Icons**: Adaptive SVG and PNG icons at 192x192 and 512x512 with maskable purpose.
- **App Shortcuts**:
  1. *Post Free Ad* (`/?action=sell`)
  2. *My Messages* (`/?action=chat`)
  3. *Saved Wishlist* (`/?action=wishlist`)

### 2.2 Service Worker Strategy (`frontend/public/sw.js`)
- **App Shell Pre-caching**: Automatically caches `/`, `/index.html`, `/manifest.json`, and SVG branding icons during `install`.
- **API Cache Strategy**: Network-first with cached response fallback for `/api/v1/` endpoints; returns a clean JSON offline error if disconnected.
- **Static Assets Strategy**: Stale-while-revalidate for script bundles, stylesheets, and images.
- **Bypass**: WebSocket / Socket.IO traffic (`/socket.io/`) and non-GET requests are excluded from intercepting.

---

## 3. Containerization & Production Topology

### 3.1 Architecture Diagram
```
                     Internet (Port 80 / 443)
                                │
                                ▼
                   ┌─────────────────────────┐
                   │   Nginx Alpine Proxy    │
                   │  (Gzip, Cache, Security)│
                   └────────────┬────────────┘
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
┌──────────────────┐                        ┌──────────────────┐
│  Frontend SPA    │                        │  Backend API     │
│  (React + Vite)  │                        │  (Express + WS)  │
└──────────────────┘                        └─────────┬────────┘
                                                      │
                                                      ▼
                                            ┌──────────────────┐
                                            │  MySQL 8.4 DB    │
                                            │  (olx_marketplace│
                                            └──────────────────┘
```

### 3.2 Dockerfiles
- **Backend (`backend/Dockerfile`)**:
  - Multi-stage build (`builder` compiles TypeScript, generates Prisma client; `runner` runs lean Node 20 Alpine).
  - Runs under non-root system user (`appuser:appgroup`).
  - Automated health check via `wget --spider http://localhost:5000/api/v1/health`.
- **Frontend (`frontend/Dockerfile`)**:
  - Multi-stage build (`builder` runs `npm run build`; `nginx:alpine` serves static files and acts as reverse proxy).
  - Automated health check via `wget --spider http://localhost/`.

---

## 4. Production Deployment Runbook

### 4.1 Prerequisites
- Docker Engine 24+ and Docker Compose v2+
- Or Node.js 20 LTS + MySQL 8.4 installed locally

### 4.2 Starting via Docker Compose
```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Build and launch all containers in detached mode
docker compose up --build -d

# 3. Apply database migrations inside the backend container
docker compose exec backend npx prisma db push

# 4. Seed initial categories, locations, and sample ads
docker compose exec backend npx tsx prisma/seed.ts
docker compose exec backend npx tsx prisma/seed_moderation.ts

# 5. Check container statuses and logs
docker compose ps
docker compose logs -f backend
```

### 4.3 Running Locally (Development Mode)
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## 5. Automated Verification Test Suite

The end-to-end automated test suite is located at:
`tests/e2e_full_platform.ps1`

### Test Coverage across All 7 Phases:
1. **API Health Check**: Verifies `/api/v1/health` and database connectivity.
2. **Indian Mobile OTP Auth**: Tests 6-digit mock OTP dispatch and JWT session generation.
3. **Category Tree & Schema**: Tests dynamic attribute resolution and inheritance.
4. **Post Ad Creation**: Validates mandatory attribute constraints, image payloads, and active status.
5. **Discovery & Privacy**: Full-text search, ad details view count increment, and click-to-reveal phone with DPDP audit.
6. **Wishlists & Chat**: Toggle favorites, atomic counters, and buyer-seller chat session initiation.
7. **Anti-Fraud Interception**: Tests auto-flagging of scam keywords/advance payment patterns to `PENDING_REVIEW`, followed by admin moderation review.
8. **PWA & Production Configs**: Verifies manifest, service worker, icons, Dockerfiles, and compose configurations.

### Running the Suite:
```powershell
powershell -File "d:\BN COMPANY\olx-main\tests\e2e_full_platform.ps1"
```
Output:
```
==================================================================
  ALL 7 PHASES TESTED & 100% OPERATIONAL IN PRODUCTION SUITE!
==================================================================
```
