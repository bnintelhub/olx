import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, COMMON_HEADERS } from '../config.js';

const queries = ['car', 'phone', 'bike', 'flat', 'laptop'];

export function runSearch() {
  const query = queries[Math.floor(Math.random() * queries.length)];
  const res = http.get(`${BASE_URL}/api/v1/ads?search=${query}&limit=10`, { headers: COMMON_HEADERS });
  check(res, {
    'search ads 200': (r) => r.status === 200,
  });
}

