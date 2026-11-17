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

// Optional Test User Credentials for Authenticated Endpoints
export const AUTH_CREDENTIALS = {
  email: __ENV.TEST_USER_EMAIL || '',
  password: __ENV.TEST_USER_PASSWORD || '',
};

// Sample rate for failure logging (1 error logged per N failures)
export const SAMPLE_LOG_RATE = parseInt(__ENV.SAMPLE_LOG_RATE || '100', 10);

/**
 * Production-Grade Performance Thresholds
 * 
 * Strict SLIs (Service Level Indicators):
 * - p95 Latency < 400ms
 * - p99 Latency < 800ms
 * - Global failure rate < 5% (under stress/peak load)
 * - Zero unhandled 5xx server crashes tolerated (< 10)
 */
export const THRESHOLDS = {
  http_req_failed: ['rate<0.05'], // Max 5% HTTP transport/status failures
  http_req_duration: ['p(95)<400', 'p(99)<800'], // 95% under 400ms, 99% under 800ms
  status_5xx_server_error: ['count<10'], // Less than 10 5xx errors across entire run
  expected_response_failures: ['count<50'], // Business schema validation failures threshold
};
