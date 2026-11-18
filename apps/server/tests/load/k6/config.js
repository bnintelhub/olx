/**
 * BharatMarket k6 Benchmark Configuration
 */

// Target Server Base URL (strips any trailing slash)
const rawBase = __ENV.TARGET_URL || 'http://localhost:5000';
export const BASE_URL = rawBase.replace(/\/+$/, '');

// Common HTTP Headers for all requests
export const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Test User Credentials for Authenticated Endpoints (defaults to seeded Admin account)
export const AUTH_CREDENTIALS = {
  email: __ENV.TEST_USER_EMAIL || 'rahul@gmail.com',
  password: __ENV.TEST_USER_PASSWORD || 'rahul@123',
};

// Sample rate for failure logging (1 error logged per N failures)
export const SAMPLE_LOG_RATE = parseInt(__ENV.SAMPLE_LOG_RATE || '100', 10);

/**
 * Configure k6 to calculate p99 (and p50/p90/p95/max) for all trend metrics
 * By default k6 only calculates avg, min, med, max, p(90), p(95).
 */
export const SUMMARY_TREND_STATS = [
  'avg',
  'min',
  'med',
  'max',
  'p(90)',
  'p(95)',
  'p(99)',
];

/**
 * Production-Grade Performance Thresholds (SLIs)
 * 
 * Strict targets:
 * - p95 Latency < 400ms
 * - p99 Latency < 800ms
 * - 5xx Error Rate < 0.01%
 * - Timeouts ≈ 0%
 * - HTTP failure rate < 5%
 * - Business Contract Errors = 0
 */
export const THRESHOLDS = {
  http_req_failed: ['rate<0.05'], // Max 5% failure
  http_req_duration: ['p(95)<400', 'p(99)<800'], // 95% < 400ms, 99% < 800ms
  status_5xx_server_error: ['count<10'], // Less than 10 5xx errors
  expected_response_failures: ['count<1'], // Zero business errors tolerated
};
