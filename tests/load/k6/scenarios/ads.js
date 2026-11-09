import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, COMMON_HEADERS } from '../config.js';

export function runAdDetails() {
  const res = http.get(`${BASE_URL}/api/v1/ads?limit=10`, { headers: COMMON_HEADERS });
  check(res, {
    'ads list 200': (r) => r.status === 200,
  });
}

