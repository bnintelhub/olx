#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-staging}"
echo "🚀 Starting deployment for environment: ${ENV}..."

# Pull latest images or rebuild
if [ "$ENV" = "production" ]; then
    docker compose -f infrastructure/compose/docker-compose.prod.yml pull || docker compose -f infrastructure/compose/docker-compose.prod.yml build
    docker compose -f infrastructure/compose/docker-compose.prod.yml up -d --remove-orphans
else
    docker compose -f infrastructure/compose/docker-compose.staging.yml up -d --build --remove-orphans
fi

echo "✅ Running database migrations..."
./infrastructure/scripts/migrate.sh "$ENV"

echo "🔍 Verifying deployment health..."
./infrastructure/scripts/health-check.sh

echo "🎉 Deployment successful!"

