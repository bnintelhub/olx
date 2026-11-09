import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, COMMON_HEADERS } from '../config.js';

export function runBrowsing() {
  const res = http.get(`${BASE_URL}/api/v1/categories`, { headers: COMMON_HEADERS });
  check(res, {
    'browsing categories 200': (r) => r.status === 200,
  });
}

