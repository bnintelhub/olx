import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, COMMON_HEADERS } from '../config.js';

export function runMessaging() {
  const res = http.get(`${BASE_URL}/health`, { headers: COMMON_HEADERS });
  check(res, {
    'messaging probe 200': (r) => r.status === 200,
  });
}

