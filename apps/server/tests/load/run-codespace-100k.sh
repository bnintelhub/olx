#!/usr/bin/env bash
# ==============================================================================
# BharatMarket (OLX) — Autocannon Load Test Suite for GitHub Codespaces
# ==============================================================================
set -e

# 1. Optimize Linux OS File Descriptor & Socket Limits for Codespaces
echo "🔧 Optimizing GitHub Codespaces socket and file descriptor limits..."
ulimit -n 1048576 2>/dev/null || ulimit -n 65535 2>/dev/null || true
echo "✅ Max Open File Descriptors: $(ulimit -n)"

MODE="${1:-mixed}"
BASE_HOST="${2:-http://localhost}"

echo "================================================================================"
echo "🚀 BharatMarket 1 Lakh (100,000) Load Test Suite"
echo "💻 Host: ${BASE_HOST}"
echo "🎯 Mode: ${MODE}"
echo "================================================================================"

# Check if target is responding
echo "🔍 Checking gateway availability..."
if curl -s -f -I "${BASE_HOST}/health" > /dev/null 2>&1; then
  echo "✅ Gateway is ONLINE and responding at ${BASE_HOST}/health"
else
  echo "⚠️ Gateway did not respond to /health. Testing anyway..."
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$MODE" in
  mixed)
    echo "Running 7-Stage Realistic Mixed Load (100 -> 1 Lakh in-flight)..."
    node "${SCRIPT_DIR}/autocannon-mixed-100k.js" "${BASE_HOST}"
    ;;
  spike)
    echo "Running Traffic Spike & Burst Test..."
    node "${SCRIPT_DIR}/autocannon-spike.js" "${BASE_HOST}/api/v1/ads?limit=16"
    ;;
  ads)
    echo "Running Ads Feed Exponential Test..."
    node "${SCRIPT_DIR}/autocannon-exponential.js" "${BASE_HOST}/api/v1/ads?limit=16"
    ;;
  categories)
    echo "Running Categories Taxonomy Test..."
    node "${SCRIPT_DIR}/autocannon-exponential.js" "${BASE_HOST}/api/v1/categories"
    ;;
  search)
    echo "Running Search Pipeline Test..."
    node "${SCRIPT_DIR}/autocannon-exponential.js" "${BASE_HOST}/api/v1/ads?q=car"
    ;;
  health)
    echo "Running High-Speed Baseline Health Test..."
    node "${SCRIPT_DIR}/autocannon-exponential.js" "${BASE_HOST}/health"
    ;;
  *)
    echo "Custom URL Target: ${MODE}"
    node "${SCRIPT_DIR}/autocannon-exponential.js" "${MODE}"
    ;;
esac
