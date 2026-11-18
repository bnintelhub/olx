import { runSearch } from './scenarios/search.js';
import { runWebSocketChat } from './scenarios/websocket-chat.js';
import { runSSENotifications } from './scenarios/sse-notifications.js';
import { testSendMessage } from './scenarios/http-apis.js';
import { BASE_URL, AUTH_CREDENTIALS, THRESHOLDS, SUMMARY_TREND_STATS } from './config.js';
import { authenticateUser, verifyTargetReachable } from './lib/helpers.js';
import { generateBenchmarkSummary } from './lib/summary.js';

/**
 * 150k Spike & High-Throughput Burst Benchmark
 * 
 * Simulates extreme flash-sale or breaking announcement events:
 * 1. Sustained 100,000 active load.
 * 2. Sudden explosive spike to 150,000 concurrent connection requests.
 * 3. Message burst surging from 10k msgs/sec to 50k msgs/sec.
 * 4. Tests rate-limiters, backpressure, and graceful degradation.
 */
export const options = {
  scenarios: {
    extreme_spike_150k: {
      executor: 'ramping-arrival-rate',
      startRate: 10000,
      timeUnit: '1s',
      preAllocatedVUs: 10000,
      maxVUs: 60000,
      stages: [
        { duration: '1m',  target: 50000 },   // Pre-warm to 50k req/s
        { duration: '1m',  target: 100000 },  // Plateau at 100k req/s
        { duration: '15s', target: 150000 },  // EXPLOSIVE SPIKE: 150,000 req/s
        { duration: '45s', target: 150000 },  // Sustained spike ceiling
        { duration: '30s', target: 50000 },   // Descent to 50k
        { duration: '30s', target: 5000 },    // Normalization
      ],
    },
  },
  thresholds: {
    ...THRESHOLDS,
    http_req_failed: ['rate<0.05'], // Max 5% 429/5xx during 150k extreme peak
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
  },
  summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
  console.log(`================================================================`);
  console.log(`💥 BharatMarket 150k Extreme Spike & Message Burst Benchmark`);
  console.log(`🎯 Target: 100k -> 150k Spike | 10k -> 50k msg/sec burst`);
  console.log(`📡 Target Gateway: ${BASE_URL}`);
  console.log(`================================================================`);

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

  if (roll < 0.40) {
    // 40% Heavy Catalog Search & Browse
    runSearch();
  } else if (roll < 0.70) {
    // 30% WebSocket High-Throughput Chat & Burst Messages
    runWebSocketChat(token, 8, 4);
  } else if (roll < 0.85) {
    // 15% Rapid Message Sends via REST
    testSendMessage(token);
  } else {
    // 15% SSE Real-time Notification Ingestion
    runSSENotifications(token, 10);
  }
}

export function handleSummary(data) {
  return {
    stdout: generateBenchmarkSummary(data),
  };
}
