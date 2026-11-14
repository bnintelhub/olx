# BharatMarket — Load & Performance Benchmark Suite

Industrial-grade load testing and exponential breakpoint benchmarking suite for the BharatMarket (OLX) Monorepo.

Supports testing up to **1 Lakh (100,000) Concurrent In-Flight Requests** directly in **GitHub Codespaces**, Docker, or Linux VPS environments.

---

## Directory Structure

```text
tests/load/
├── autocannon-exponential.js   # 1 Lakh Exponential Autocannon runner (Zero-setup Node.js)
├── run-codespace-100k.sh       # Codespace OS-optimized runner with ulimit tuning
├── k6/
│   ├── exponential-100k.js     # k6 1 Lakh ramping arrival rate scenario
│   ├── stress.js               # Multi-scenario breaking point test (up to 10k VUs)
│   ├── spike.js                # Instant surge test (up to 5k VUs)
│   ├── config.js               # Shared target URLs and thresholds
│   └── scenarios/              # Realistic user workflows (search, browsing, ads, messaging)
```

---

## 🚀 Running 1 Lakh (100,000) Exponential Load Test

### Method 1: In GitHub Codespaces (Recommended)

GitHub Codespaces containers run Linux with high CPU burst capacity. Run the pre-tuned bash runner:

```bash
# 1. Give execute permissions
chmod +x tests/load/run-codespace-100k.sh

# 2. Test Nginx Gateway Health
./tests/load/run-codespace-100k.sh health

# 3. Test Full-Stack Ads API & Database Reads
./tests/load/run-codespace-100k.sh ads

# 4. Test Categories Taxonomy
./tests/load/run-codespace-100k.sh categories

# 5. Test Search & Filter Pipeline
./tests/load/run-codespace-100k.sh search
```

*Note: `run-codespace-100k.sh` automatically raises OS file descriptor limits (`ulimit -n 1048576`) to prevent `EMFILE: too many open files` errors.*

---

### Method 2: Via pnpm (Cross-Platform)

```bash
# Exponential Test (100 -> 500 -> 2k -> 10k -> 25k -> 50k -> 1 Lakh)
pnpm test:load:100k

# Target specific endpoints:
pnpm test:load:100k http://localhost/health
pnpm test:load:100k http://localhost/api/v1/ads?limit=16
pnpm test:load:100k http://localhost:5000/api/v1/health
```

---

### Method 3: Via k6 (Docker or Local)

```bash
# Run with Docker
docker run --rm -i -v "${PWD}/tests/load/k6:/k6" \
  -e TARGET_URL=http://host.docker.internal:5000 \
  grafana/k6 run /k6/exponential-100k.js

# If k6 is installed natively
k6 run tests/load/k6/exponential-100k.js
```

---

## 📈 The 7 Exponential Concurrency Stages

| Stage | Target In-Flight Concurrency | Raw Sockets & Pipelining | Duration | Objective |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **100** | 50 conns × 2 pipe | 10s | Warmup & baseline measurement |
| **Stage 2** | **500** | 100 conns × 5 pipe | 12s | Normal daily traffic density |
| **Stage 3** | **2,000** | 200 conns × 10 pipe | 15s | Peak evening hour traffic |
| **Stage 4** | **10,000** | 500 conns × 20 pipe | 18s | Marketing campaign spike |
| **Stage 5** | **25,000** | 1250 conns × 20 pipe | 20s | Flash sale / Festival surge |
| **Stage 6** | **50,000** | 2500 conns × 20 pipe | 25s | Heavy enterprise concurrency stress |
| **Stage 7** | **100,000 (1 Lakh)** | 5000 conns × 20 pipe | 30s | **1 Lakh Target & Breakpoint Probe** |

---

## 📊 How to Interpret Results

1. **Req/Sec (Throughput)**:
   - Fastify single-instance healthy benchmark: **15,000 – 35,000 req/sec**.
   - Nginx cached media/health benchmark: **40,000 – 70,000 req/sec**.
2. **Latency (p99)**:
   - `< 100ms`: Exceptional.
   - `100ms - 300ms`: Acceptable under 50k+ concurrency.
   - `> 1000ms`: Server event loop backlog or database connection pool starvation.
3. **Status Codes (2xx vs 5xx)**:
   - `2xx`: Successful in-flight deliveries.
   - `5xx / Timeouts`: Identifies exact saturation point.
   - If 5xx appears around 50k, scale horizontally:
     ```bash
     docker compose -f docker-compose.prod.yml up -d --scale server=3
     ```
