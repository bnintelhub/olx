# Infrastructure Architecture

This directory houses operational infrastructure definitions for BharatMarket / OLX:

## Directory Structure
- `docker/`: Standardized container definitions for `dev` and `prod` (`Dockerfile.server`, `Dockerfile.worker`, `Dockerfile.client`, `Dockerfile.admin`, `Dockerfile.nginx`).
- `nginx/`: Unified reverse proxy gateway configurations:
  - `nginx.conf`: Core Nginx process and performance settings.
  - `nginx.dev.conf`: Local development proxy with Vite HMR and WebSocket support.
  - `nginx.prod.conf`: Production gateway with caching, Let's Encrypt ACME challenges, and SPA routing.
- `load-balancer/`: Upstream configurations for high-concurrency traffic routing.
- `monitoring/`: Prometheus metric collection, Grafana dashboards, Loki logging, Alertmanager rules.
- `scripts/`: Deployment, rollback, migration, and health verification scripts.

## Root Deployment Files
All Docker Compose orchestration and environment files are maintained cleanly at the repository root:
- `docker-compose.dev.yml`: Local full-stack container environment (`.env.development`).
- `docker-compose.prod.yml`: Production full-stack container environment (`.env.production`).
- `.env.development` / `.env.production`: Consolidated environment variables.
