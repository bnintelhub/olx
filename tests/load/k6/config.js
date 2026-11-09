export const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5000';

export const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const THRESHOLDS = {
  http_req_failed: ['rate<0.01'], // < 1% failures
  http_req_duration: ['p(95)<400', 'p(99)<800'], // 95% < 400ms, 99% < 800ms
};

