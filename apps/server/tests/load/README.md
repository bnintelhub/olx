# BharatMarket — Autocannon High-Performance Load Testing Suite

Industrial-grade load testing and exponential breakpoint benchmarking suite for the BharatMarket (OLX) Monorepo.

Supports testing up to **1 Lakh (100,000) Concurrent In-Flight Requests** directly in **GitHub Codespaces**, Docker, or Linux VPS environments using **Autocannon** (high-throughput, zero external C++ build dependencies, multi-threaded pipelined HTTP benchmark runner).

---

## Directory Structure

```text
tests/load/
├── autocannon-mixed-100k.js    # 7-Stage Realistic Marketplace Traffic Benchmark (up to 1 Lakh in-flight)
├── autocannon-spike.js         # Flash Surge & Spike Benchmark (50k -> 100k surge)
├── autocannon-exponential.js   # Single endpoint exponential load runner
├── run-codespace-100k.sh       # Codespace OS-optimized runner with ulimit tuning
└── README.md                   # Documentation & execution guide
```

---

## 🚀 Running the Benchmarks

### 1. Realistic Mixed Marketplace Flow (100 to 100,000 In-Flight)
Simulates realistic buyer/seller distributions:
- **40%** Catalog Feed (`/api/v1/ads`)
- **20%** Search Queries (`/api/v1/ads?q=...`)
- **15%** Category Taxonomy (`/api/v1/categories`)
- **10%** Nested Category Tree (`/api/v1/categories/tree`)
- **10%** Authenticated User Notifications (`/api/v1/notifications`)
- **5%** Authenticated Chat Conversations (`/api/v1/chat/conversations`)

```bash
# From monorepo root
pnpm test:load:mixed

# Custom target URL
TARGET_URL=http://localhost:5000 pnpm test:load:mixed
```

### 2. Sudden Flash Spike Surge (50k -> 100k Surge)
```bash
# From monorepo root
pnpm test:load:spike

# Custom target URL
TARGET_URL=http://localhost:5000 pnpm test:load:spike
```

### 3. GitHub Codespaces / Linux VPS Runner
Automatically tunes OS file descriptor limits (`ulimit -n 1048576`) and triggers multi-worker Autocannon benchmarks:

```bash
# Run mixed benchmark
bash apps/server/tests/load/run-codespace-100k.sh mixed

# Run flash spike benchmark
bash apps/server/tests/load/run-codespace-100k.sh spike

# Specific endpoint tests
bash apps/server/tests/load/run-codespace-100k.sh ads
bash apps/server/tests/load/run-codespace-100k.sh categories
bash apps/server/tests/load/run-codespace-100k.sh search
```

---

## 📈 7-Stage Progression (`autocannon-mixed-100k.js`)

| Stage | In-Flight Requests | Connections × Pipelining | Duration | Objective |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **100** | 100 conn × 1 pipe | 15s | Warmup & baseline cache pre-fill |
| **Stage 2** | **500** | 250 conn × 2 pipe | 20s | Moderate concurrent buyer activity |
| **Stage 3** | **2,000** | 500 conn × 4 pipe | 30s | Daily peak hour traffic |
| **Stage 4** | **10,000** | 1,000 conn × 10 pipe | 45s | Heavy promotional campaign surge |
| **Stage 5** | **25,000** | 2,500 conn × 10 pipe | 45s | High-concurrency flash sale traffic |
| **Stage 6** | **50,000** | 5,000 conn × 10 pipe | 60s | Breakpoint probe & cluster stress |
| **Stage 7** | **100,000** | 5,000 conn × 20 pipe | 60s | **1 Lakh In-Flight Peak Saturation** |

---

## ⚙️ Configuration & Environment Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `TARGET_URL` | `http://localhost:5000` | Target URL (Nginx load balancer `http://localhost` or direct Fastify `http://localhost:5000`) |
| `TEST_USER_EMAIL` | `rahul@gmail.com` | User email for pre-test JWT auth |
| `TEST_USER_PASSWORD`| `rahul@123` | User password for pre-test JWT auth |
| `WORKERS` | `Math.max(2, numCPUs - 1)` | Worker threads spawned to drive connection throughput |
