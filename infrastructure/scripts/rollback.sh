#!/usr/bin/env bash
set -euo pipefail

PREV_TAG="${1:-previous}"
echo "⚠️ Initiating rollback to image tag: ${PREV_TAG}..."

export IMAGE_TAG="$PREV_TAG"
docker compose -f docker-compose.prod.yml up -d --no-build

./infrastructure/scripts/health-check.sh
echo "✅ Rollback completed and health checks verified."

