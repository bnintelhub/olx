# 08. DevOps, Deployment Pipeline & Testing Strategy

---

## 1. Environment Topology & Infrastructure Architecture

The deployment architecture separates stateless computing (Docker containers) from stateful managed services:

```mermaid
graph TB
    subgraph Edge ["Edge Tier"]
        DNS["Route 53 / Cloudflare DNS"]
        CDN["CloudFront / Cloudflare Edge Cache<br/>(Static Assets & WebP Media)"]
        WAF["AWS WAF (DDoS & Rate Limiting)"]
    end

    subgraph ComputeCluster ["Compute Tier (Docker / AWS ECS or Hetzner VPS)"]
        LB["Nginx Reverse Proxy / Ingress ALB"]
        WebNodes["Next.js SSR Nodes (2x Replicas)<br/>apps/web"]
        APINodes["NestJS API Nodes (2x Replicas)<br/>apps/api"]
        WorkerNodes["BullMQ Workers (1x Replica)<br/>apps/api:worker"]
    end

    subgraph DataTier ["Managed Data Tier (AWS ap-south-1 Mumbai)"]
        RDS[("AWS RDS PostgreSQL 16 + PostGIS<br/>(Multi-AZ with Read Replica)")]
        ElastiCache[("AWS ElastiCache Redis 7 Cluster<br/>(Primary + Failover)")]
        S3Bucket[("AWS S3 Bucket<br/>(Encrypted, Private, Lifecycle: 90d to Glacier)")]
    end

    DNS --> WAF --> CDN --> LB
    LB --> WebNodes
    LB --> APINodes

    APINodes --> RDS
    APINodes --> ElastiCache
    APINodes --> S3Bucket

    WorkerNodes --> ElastiCache
    WorkerNodes --> RDS
    WorkerNodes --> S3Bucket
```

### Environment Tiers
1. **Local Development**: Docker Compose running PostgreSQL (with PostGIS), Redis, MinIO (S3 mock), and MailHog.
2. **Staging**: Hosted on a dedicated Hetzner / AWS ECS cluster mirroring production, connected to Staging RDS and Redis.
3. **Production**: Multi-AZ AWS architecture in `ap-south-1` (Mumbai) guaranteeing data residency and sub-30ms latency across Indian telecom networks (Jio, Airtel).

---

## 2. Environment Variables Matrix

| Variable Name | Environment | Sensitive? | Purpose & Example |
| :--- | :---: | :---: | :--- |
| `NODE_ENV` | All | No | `development` \| `staging` \| `production` |
| `PORT` | API | No | `4000` |
| `DATABASE_URL` | API/Worker | **Yes** | `postgresql://user:pass@host:5432/olx_prod?schema=public` |
| `REDIS_URL` | API/Worker | **Yes** | `rediss://default:pass@redis-host:6379` |
| `JWT_ACCESS_SECRET` | API | **Yes** | 256-bit cryptographic signing secret |
| `JWT_REFRESH_SECRET` | API | **Yes** | 256-bit cryptographic signing secret |
| `AWS_REGION` | API/Worker | No | `ap-south-1` |
| `AWS_S3_BUCKET_NAME`| API/Worker | No | `bharatmarket-media-prod` |
| `AWS_ACCESS_KEY_ID` | API/Worker | **Yes** | S3 IAM user key |
| `AWS_SECRET_ACCESS_KEY`| API/Worker | **Yes** | S3 IAM user secret |
| `MSG91_AUTH_KEY` | API | **Yes** | Indian SMS gateway authentication key |
| `MSG91_OTP_TEMPLATE_ID`| API | No | DLT approved template identifier |
| `FIREBASE_PROJECT_ID`| API/Worker | No | FCM push notification project |
| `FIREBASE_CLIENT_EMAIL`| API/Worker| **Yes** | Service account credentials |
| `FIREBASE_PRIVATE_KEY`| API/Worker | **Yes** | Service account private key |
| `NEXT_PUBLIC_API_URL`| Web | No | `https://api.bharatmarket.in` |
| `NEXT_PUBLIC_WS_URL` | Web | No | `wss://api.bharatmarket.in` |

---

## 3. Local Docker Compose Architecture (`docker/docker-compose.yml`)

Developers can start the entire backing infrastructure locally with one command:

```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:16-3.4-alpine
    container_name: olx_postgres
    restart: always
    environment:
      POSTGRES_USER: olx_user
      POSTGRES_PASSWORD: olx_password
      POSTGRES_DB: olx_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U olx_user -d olx_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: olx_redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:RELEASE.2024-01-18T22-51-28Z
    container_name: olx_minio
    restart: always
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadminpassword
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data
    command: server /data --console-address ":9001"

volumes:
  pgdata:
  redisdata:
  miniodata:
```

---

## 4. CI/CD GitHub Actions Pipeline (`.github/workflows/ci.yml`)

Every pull request triggers automated checks before merge:

```mermaid
graph TD
    PR["Git Push / Pull Request"] --> Lint["1. Lint & Code Style<br/>(ESLint + Prettier)"]
    PR --> TypeCheck["2. Strict TypeCheck<br/>(tsc --noEmit)"]
    
    Lint --> UnitTests["3. Unit Tests<br/>(Vitest / Jest)"]
    TypeCheck --> UnitTests
    
    UnitTests --> Integration["4. Integration Tests<br/>(Supertest + Testcontainers PG/Redis)"]
    Integration --> BuildTest["5. Container Build Check<br/>(Docker build --check)"]
    
    BuildTest --> DeployStaging["6. Auto-Deploy to Staging<br/>(On merge to 'main')"]
```

---

## 5. Testing Strategy & Pyramid

### 5.1 Unit Tests (Vitest / Jest)
- **Scope**: Business logic functions, DTO validators, ranking formulas, phone sanitization utilities, and Prisma query builders.
- **Target Coverage**: > 80% coverage on core services (`AdsService`, `AuthService`, `SearchService`).

### 5.2 Integration Tests (Supertest + Real DB)
- Uses ephemeral PostgreSQL and Redis instances (via `testcontainers-node` or GitHub Actions services).
- **Test Scenarios**:
  - Full OTP cycle: `/auth/otp/send` -> Database record -> `/auth/otp/verify` -> JWT generation.
  - Ad posting: Validation error on missing category attributes -> Successful submission -> Image queue dispatch.
  - Phone masking verification: Guest blocked -> Logged-in user allowed -> Rate limiter enforcement at 16th reveal.

### 5.3 End-to-End (E2E) Browser Tests (Playwright)
- **Critical Flow 1**: User logs in with phone OTP, posts an ad with 3 photos, confirms ad shows on Home page.
- **Critical Flow 2**: Buyer searches for item, opens chat modal, sends message; seller sees live socket event in real-time.
- **Critical Flow 3**: Admin approves ad from moderation queue; ad status changes from `PENDING_REVIEW` to `ACTIVE`.

---

## 6. Observability, Logging & Database Backup Plan

1. **Structured Logging**:
   - NestJS uses **Pino** (`nestjs-pino`) formatting logs in structured JSON format with contextual metadata (`requestId`, `userId`, `ipAddress`, `responseTimeMs`).
2. **Error Tracking & APM**:
   - Sentry integrated in both frontend (Next.js client/server) and backend (NestJS interceptor) for real-time unhandled exception capture with sourcemap support.
3. **Database Backup & Disaster Recovery**:
   - Automated daily snapshots on AWS RDS with 14-day retention.
   - Continuous Write-Ahead Log (WAL) archiving to S3, enabling Point-In-Time Recovery (PITR) within 5 minutes of disaster.

---

## 7. Open Questions & Assumptions
- **Assumed**: Initial production hosting will utilize Docker containers on an orchestrated cloud setup (AWS ECS Fargate or a hardened Ubuntu VPS with automated Nginx reverse proxy and Let's Encrypt SSL).
- **Question**: Should we implement Blue-Green zero-downtime deployments via AWS CodeDeploy or rolling updates in ECS? *(Current assumption: Rolling zero-downtime container updates).*
