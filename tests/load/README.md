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
│   ├── config.js               # Shared target URLs, thresholds, and auth credentials
│   ├── lib/
│   │   ├── metrics.js          # Custom k6 metrics (HTTP status counters, latencies, validation)
│   │   └── helpers.js          # Reusable HTTP client, auth login, checks, and sampled logging
│   ├── scenarios/
│   │   ├── search.js           # Realistic catalog search & filters
│   │   ├── browsing.js         # Category taxonomy & tree navigation
│   │   ├── ads.js              # Ad feed & suggestions
│   │   └── messaging.js        # Authenticated user conversations & health fallback
│   ├── stress.js               # 7-stage realistic VU breakpoint benchmark (100 -> 10,000 VUs)
│   ├── spike.js                # Instant surge test (500 -> 5,000 VUs)
│   └── exponential-100k.js     # 1 Lakh arrival rate high-throughput benchmark
```

---

## 🚀 Running the Benchmarks

### 1. Staged Breakpoint Benchmark (Recommended: 100 to 10,000 VUs)

Tests realistic user flows through 7 progressive stages to identify saturation breakpoints:

```bash
# If k6 is installed natively
k6 run -e TARGET_URL=http://localhost:5000 tests/load/k6/stress.js

# With authentic user login
k6 run \
  -e TARGET_URL=http://localhost:5000 \
  -e TEST_USER_EMAIL=user@example.com \
  -e TEST_USER_PASSWORD=SecretPassword123 \
  tests/load/k6/stress.js

# Via Docker (Connecting to Docker internal network)
docker run --rm -i --network bharatmarket_net -v "${PWD}/tests/load/k6:/k6" \
  -e TARGET_URL=http://server:5000 \
  grafana/k6 run /k6/stress.js
```

### 2. 1 Lakh (100,000) Concurrent Exponential Load Test

```bash
# Via Docker on Linux/Codespaces
docker run --rm -i --network bharatmarket_net -v "${PWD}/tests/load/k6:/k6" \
  -e TARGET_URL=http://server:5000 \
  grafana/k6 run /k6/exponential-100k.js

# Via Autocannon (Zero dependencies Node.js)
pnpm test:load:100k http://localhost/api/v1/ads?limit=16
```

---

## 📈 7-Stage VU Progression (`stress.js`)

| Stage | Target VUs | Duration | Objective |
| :--- | :--- | :--- | :--- |
| **Stage 1** | **100 VUs** | 30s | Warmup & baseline measurement |
| **Stage 2** | **250 VUs** | 30s | Light production load |
| **Stage 3** | **500 VUs** | 1m | Standard daily peak traffic |
| **Stage 4** | **1,000 VUs** | 1m | Evening rush hour surge |
| **Stage 5** | **2,000 VUs** | 2m | High-density marketing campaign surge |
| **Stage 6** | **5,000 VUs** | 2m | Heavy festival spike stress |
| **Stage 7** | **10,000 VUs** | 2m | **Breakpoint probe & saturation test** |
| **Stage 8** | **0 VUs** | 1m | Cooldown & recovery verification |

---

## 📊 Custom Metrics & Telemetry

The suite captures granular custom metrics to cleanly distinguish root causes:

1. **Status Code Tracking**:
   - `successful_http_responses`: HTTP 2xx count
   - `failed_http_responses`: HTTP >= 400 or network connection errors
   - `status_401_unauthorized`: Missing or expired auth token
   - `status_403_forbidden`: Role/permission or CSRF rejection
   - `status_404_not_found`: Broken route or missing entity
   - `status_429_rate_limited`: Fastify or Nginx rate limiter activation
   - `status_5xx_server_error`: Unhandled backend exceptions or database crashes
2. **Business Contract Validation**:
   - `expected_response_failures`: Malformed JSON or API `success: false`
3. **Endpoint-Specific Latencies & Error Rates**:
   - `latency_search_ads`, `error_rate_search_ads`
   - `latency_ads_list`, `error_rate_ads_list`
   - `latency_browsing_categories`, `error_rate_browsing_categories`
   - `latency_messaging_probe`, `error_rate_messaging_probe`

---

## ⚙️ Rate Limiting Considerations

Fastify enforces a default rate limit of **200 requests/minute per IP** (`apps/server/src/plugins/rate-limit.plugin.ts`).
During high-concurrency benchmarks originating from a single IP, this limit is exhausted in milliseconds, causing Fastify to return `429 Too Many Requests` in ~1ms.

To benchmark actual backend query performance without artificial rate limiting:
- In `.env.development` or `.env.production`, ensure `ENABLE_RATE_LIMIT=false`.
