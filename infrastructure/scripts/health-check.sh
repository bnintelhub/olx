#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-http://localhost:5000}"
MAX_RETRIES=15
RETRY_DELAY=2

echo "🔎 Checking health of ${TARGET_URL}/health..."

for i in $(seq 1 $MAX_RETRIES); do
    if curl -s -f "${TARGET_URL}/health" > /dev/null; then
        echo "✅ Liveness probe passed!"
        break
    fi
    echo "Waiting for service to become healthy (attempt $i/$MAX_RETRIES)..."
    sleep $RETRY_DELAY
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        echo "❌ Liveness probe failed after $MAX_RETRIES attempts."
        exit 1
    fi
done

echo "🔎 Checking readiness of ${TARGET_URL}/ready..."
if curl -s -f "${TARGET_URL}/ready" > /dev/null; then
    echo "✅ Readiness probe passed!"
else
    echo "❌ Readiness probe failed!"
    exit 1
fi

