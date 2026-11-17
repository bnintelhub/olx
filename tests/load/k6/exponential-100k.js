import { runSearch } from './scenarios/search.js';
import { runBrowsing } from './scenarios/browsing.js';
import { runAdDetails } from './scenarios/ads.js';
import { runMessaging } from './scenarios/messaging.js';
import { BASE_URL, AUTH_CREDENTIALS, THRESHOLDS } from './config.js';
import { authenticateUser, verifyTargetReachable } from './lib/helpers.js';

/**
 * 1 Lakh (100,000) Concurrent Exponential Arrival Rate Benchmark
 * 
 * NOTE ON DROPPED ITERATIONS vs BACKEND FAILURES:
 * In ramping-arrival-rate, k6 attempts to start `target` iterations per second.
 * If target RPS exceeds the rate that `maxVUs` can sustain given the backend's
 * real response latency (Target RPS > maxVUs / Latency_Seconds), k6 reports:
 * "Insufficient VUs, dropped iterations".
 * Dropped iterations represent CLIENT-SIDE EXECUTOR SATURATION (the test machine
 * reached its concurrency/socket ceiling), NOT backend HTTP 5xx failures.
 */
export const options = {
  // Retain bodies for JSON validation and failure sampling unless explicitly disabled
  discardResponseBodies: __ENV.DISCARD_BODIES === 'true',
  scenarios: {
    exponential_100k: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 1000,
      maxVUs: 20000,
      stages: [
        { duration: '30s', target: 500 },     // Stage 1: 500 req/s (Warmup)
        { duration: '45s', target: 2500 },    // Stage 2: 2,500 req/s
        { duration: '1m',  target: 10000 },   // Stage 3: 10,000 req/s
        { duration: '1m',  target: 35000 },   // Stage 4: 35,000 req/s
        { duration: '1m',  target: 70000 },   // Stage 5: 70,000 req/s
        { duration: '1m',  target: 100000 },  // Stage 6: 1,00,000 req/s Peak Breakpoint
        { duration: '30s', target: 1000 },    // Stage 7: Cooldown
      ],
    },
  },
  thresholds: {
    ...THRESHOLDS,
    http_req_failed: ['rate<0.05'], // Max 5% failure at peak
  },
};

export function setup() {
  console.log(`================================================================`);
  console.log(`🚀 BharatMarket 100k Exponential Arrival Rate Benchmark`);
  console.log(`📡 Target URL: ${BASE_URL}`);
  console.log(`================================================================`);

  // Verify connectivity before scheduling iterations
  verifyTargetReachable(BASE_URL);

  let token = null;
  if (AUTH_CREDENTIALS.email && AUTH_CREDENTIALS.password) {
    token = authenticateUser(BASE_URL, AUTH_CREDENTIALS.email, AUTH_CREDENTIALS.password);
  }
  return { token };
}

export default function (data) {
  const token = data ? data.token : null;
  const roll = Math.random();

  if (roll < 0.50) {
    // 50% Catalog search & filters
    runSearch();
  } else if (roll < 0.75) {
    // 25% Category browsing
    runBrowsing();
  } else if (roll < 0.90) {
    // 15% Ad Detail & Suggestions
    runAdDetails();
  } else {
    // 10% Chat & messaging probes
    runMessaging(token);
  }
}
