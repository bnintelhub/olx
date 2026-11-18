import { runWebSocketChat } from './scenarios/websocket-chat.js';
import { runSSENotifications } from './scenarios/sse-notifications.js';
import { testNotificationList, testConversationList } from './scenarios/http-apis.js';
import { BASE_URL, AUTH_CREDENTIALS, THRESHOLDS, SUMMARY_TREND_STATS } from './config.js';
import { authenticateUser, verifyTargetReachable } from './lib/helpers.js';
import { generateBenchmarkSummary } from './lib/summary.js';

/**
 * Reconnect Storm Benchmark
 * 
 * Simulates a sudden network interruption or server restart where:
 * 1. 100,000 active connections drop abruptly.
 * 2. All 100,000 clients attempt simultaneous reconnects within a 5–10 second window.
 * 
 * Key Observations:
 * - Gateway SYN backlog & Epoll connection acceptance
 * - Node.js Event Loop lag under simultaneous handshake flood
 * - PostgreSQL Connection Pool exhaustion during mass session rehydration
 * - Redis command latency under burst AUTH & presence re-registration
 */
export const options = {
  scenarios: {
    reconnect_storm: {
      executor: 'ramping-arrival-rate',
      startRate: 1000,
      timeUnit: '1s',
      preAllocatedVUs: 5000,
      maxVUs: 40000,
      stages: [
        { duration: '30s', target: 5000 },    // Baseline 5k req/s
        { duration: '10s', target: 100 },     // Instant connection drop simulation
        { duration: '5s',  target: 50000 },   // MASS RECONNECT SURGE: 50,000 reconnects/sec
        { duration: '10s', target: 100000 },  // PEAK RECONNECT SURGE: 100,000 reconnects/sec
        { duration: '1m',  target: 20000 },   // Recovery and steady-state normalization
        { duration: '30s', target: 1000 },    // Cooldown
      ],
    },
  },
  thresholds: {
    ...THRESHOLDS,
    http_req_failed: ['rate<0.02'], // Max 2% allowed during instant 100k surge
    http_req_duration: ['p(95)<600', 'p(99)<1200'],
  },
  summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
  console.log(`================================================================`);
  console.log(`⚡ BharatMarket 100k Reconnect Storm Benchmark`);
  console.log(`🎯 Testing Mass Reconnection Flood (100k arrival surge within 10s)`);
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

  if (roll < 0.50) {
    // 50% WebSocket Reconnection attempts with heartbeat
    runWebSocketChat(token, 8, 1);
  } else if (roll < 0.80) {
    // 30% SSE Reconnection stream requests
    runSSENotifications(token, 10);
  } else {
    // 20% Initial State Sync on Reconnect (missed notifications & conversations)
    testNotificationList(token);
    testConversationList(token);
  }
}

export function handleSummary(data) {
  return {
    stdout: generateBenchmarkSummary(data),
  };
}
