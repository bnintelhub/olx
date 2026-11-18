#!/usr/bin/env bash
# ==============================================================================
# BharatMarket (OLX) — 1 Lakh (100,000) Load Test Runner for GitHub Codespaces
# ==============================================================================
set -e

# 1. Optimize Linux OS Socket & File Descriptor Limits for High Concurrency
echo "🔧 Optimizing GitHub Codespaces socket and file descriptor limits..."
ulimit -n 1048576 2>/dev/null || ulimit -n 65535 2>/dev/null || true
echo "✅ Max Open File Descriptors: $(ulimit -n)"

# 2. Parse Target Option
TARGET_MODE="${1:-health}"
BASE_HOST="${2:-http://localhost}"

case "$TARGET_MODE" in
  health)
    TARGET_URL="${BASE_HOST}/health"
    ;;
  ads)
    TARGET_URL="${BASE_HOST}/api/v1/ads?limit=16&sort=newest"
    ;;
  categories)
    TARGET_URL="${BASE_HOST}/api/v1/categories"
    ;;
  search)
    TARGET_URL="${BASE_HOST}/api/v1/ads?q=iphone"
    ;;
  direct-server)
    TARGET_URL="http://localhost:5000/api/v1/health"
    ;;
  *)
    TARGET_URL="$TARGET_MODE"
    ;;
esac

echo "================================================================================"
echo "🚀 Starting 1 Lakh (100,000) Exponential Load Test"
echo "📡 Target: ${TARGET_URL}"
echo "================================================================================"

# 3. Check if target server is responding
echo "🔍 Checking target availability..."
if curl -s -f -I "${TARGET_URL}" > /dev/null 2>&1; then
  echo "✅ Target is ONLINE and responding."
else
  echo "⚠️ Target did not respond to initial probe. Testing anyway..."
fi

echo ""
# 4. Run Autocannon Exponential Suite
node "$(dirname "$0")/autocannon-exponential.js" "${TARGET_URL}"

