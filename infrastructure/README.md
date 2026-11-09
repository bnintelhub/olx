# Infrastructure Architecture

This directory houses all operational infrastructure definitions for BharatMarket / OLX:

## Directory Structure
- `docker/`: Standardized production and worker Dockerfiles.
- `compose/`: Environment-specific Docker Compose profiles (`dev`, `staging`, `prod`).
- `nginx/`: Nginx reverse proxy, API routing, and static media caching configs.
- `load-balancer/`: Upstream configurations for high-concurrency traffic routing.
- `monitoring/`: Prometheus metric collection, Grafana dashboards, Loki logging, Alertmanager rules.
- `secrets/`: Secret management practices and guidance.
- `scripts/`: Deployment, rollback, migration, and health verification scripts.

