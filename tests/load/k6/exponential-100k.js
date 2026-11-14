import { sleep } from 'k6';
import { runSearch } from './scenarios/search.js';
import { runBrowsing } from './scenarios/browsing.js';
import { runAdDetails } from './scenarios/ads.js';
import { runMessaging } from './scenarios/messaging.js';
import { THRESHOLDS } from './config.js';

/**
 * 1 Lakh (100,000) Concurrent Exponential Load Test
 * ----------------------------------------------------------------------------
 * Stage 1: Warmup       (100 VUs / 500 req/s)
 * Stage 2: Light Load   (1,000 VUs / 2,500 req/s)
 * Stage 3: Medium Load  (5,000 VUs / 10,000 req/s)
 * Stage 4: High Surge   (20,000 VUs / 35,000 req/s)
 * Stage 5: Peak Spike   (50,000 VUs / 70,000 req/s)
 * Stage 6: 1 Lakh Peak  (100,000 Target Concurrency)
 * Stage 7: Cooldown     (Back to baseline)
 */
export const options = {
  discardResponseBodies: true, // Prevents OOM in 8GB RAM environments by not buffering response bodies
  scenarios: {
    exponential_100k: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 1000,
      maxVUs: 20000, // Controlled 20k VU baseline
      stages: [
        { duration: '30s', target: 500 },     // Stage 1: 500 req/s
        { duration: '45s', target: 2500 },    // Stage 2: 2,500 req/s
        { duration: '1m',  target: 10000 },   // Stage 3: 10,000 req/s
        { duration: '1m',  target: 35000 },   // Stage 4: 35,000 req/s
        { duration: '1m',  target: 70000 },   // Stage 5: 70,000 req/s
        { duration: '1m',  target: 100000 },  // Stage 6: 1,00,000 (1 Lakh req/s Target)
        { duration: '30s', target: 1000 },    // Stage 7: Cooldown & Recovery
      ],
    },
  },
  thresholds: {
    ...THRESHOLDS,
    http_req_failed: ['rate<0.05'], // Allow up to 5% failures at extreme 100k peak
  },
};

export default function () {
  const roll = Math.random();
  if (roll < 0.50) {
    // 50% Catalog search & filters
    runSearch();
  } else if (roll < 0.75) {
    // 25% Category browsing
    runBrowsing();
  } else if (roll < 0.95) {
    // 20% Ad Detail views
    runAdDetails();
  } else {
    // 5% Chat & messaging probes
    runMessaging();
  }
}

