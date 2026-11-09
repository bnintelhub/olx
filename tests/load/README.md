# Load Testing with k6

This directory contains realistic load testing scenarios for the BharatMarket / OLX platform.

## Directory Structure
- `scenarios/browsing.js`: Category and taxonomy navigation.
- `scenarios/search.js`: Full-text and filtered ad search queries.
- `scenarios/ads.js`: Ad listings and item detail queries.
- `scenarios/messaging.js`: Real-time chat and probe requests.
- `config.js`: Shared base URL, headers, and performance thresholds.
- `spike.js`: Sudden traffic surge simulation.
- `stress.js`: Breaking point & ramp-up stress test.

## Running Tests

### 1. Locally (if k6 CLI is installed)
```bash
k6 run tests/load/k6/spike.js
k6 run tests/load/k6/stress.js
```

### 2. Via Docker
```bash
docker run --rm -v "${PWD}/tests/load/k6:/k6" -e TARGET_URL=http://host.docker.internal:5000 grafana/k6 run /k6/spike.js
docker run --rm -v "${PWD}/tests/load/k6:/k6" -e TARGET_URL=http://host.docker.internal:5000 grafana/k6 run /k6/stress.js
```
