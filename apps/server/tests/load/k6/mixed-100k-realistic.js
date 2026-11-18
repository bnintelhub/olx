import { runSearch } from './scenarios/search.js';
import { runBrowsing } from './scenarios/browsing.js';
import { runAdDetails } from './scenarios/ads.js';
import { runWebSocketChat } from './scenarios/websocket-chat.js';
import { runSSENotifications } from './scenarios/sse-notifications.js';
import {
  testConversationList,
  testMessageHistory,
  testSendMessage,
  testMarkConversationRead,
  testNotificationList,
  testUserProfile,
  testAdPagination,
} from './scenarios/http-apis.js';
import { BASE_URL, AUTH_CREDENTIALS, THRESHOLDS, SUMMARY_TREND_STATS } from './config.js';
import { authenticateUser, verifyTargetReachable } from './lib/helpers.js';
import { generateBenchmarkSummary } from './lib/summary.js';

/**
 * 1 Lakh (100,000) User Mixed-Load Benchmark
 * 
 * Distribution:
 * - 60% Browsing, Search & Ad Catalog (HTTP Read)
 * - 20% WebSocket Active Chat Sessions (Persistent TCP / Full Duplex)
 * - 10% SSE Notification Listeners (Persistent HTTP Stream)
 * - 5% High-Throughput REST Messaging & Read Operations (HTTP Write / DB Mutate)
 * - 5% Reconnecting Churn & Profile Synchronizations
 */
export const options = {
  scenarios: {
    realistic_mixed_100k: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        // Stage 1: 100 users (Initial baseline)
        { duration: '30s', target: 100 },
        // Stage 2: 500 users
        { duration: '45s', target: 500 },
        // Stage 3: 1,000 users (Steady state check)
        { duration: '1m', target: 1000 },
        // Stage 4: 2,500 users
        { duration: '1m', target: 2500 },
        // Stage 5: 5,000 users
        { duration: '1m30s', target: 5000 },
        // Stage 6: 10,000 users (10k milestone)
        { duration: '2m', target: 10000 },
        // Stage 7: 20,000 users
        { duration: '2m', target: 20000 },
        // Stage 8: 40,000 users
        { duration: '2m', target: 40000 },
        // Stage 9: 60,000 users
        { duration: '2m30s', target: 60000 },
        // Stage 10: 80,000 users
        { duration: '2m30s', target: 80000 },
        // Stage 11: 1,00,000 users (Full 100k Peak Load)
        { duration: '3m', target: 100000 },
        // Cooldown: Return gracefully to baseline
        { duration: '1m', target: 1000 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    ...THRESHOLDS,
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    http_req_failed: ['rate<0.001'], // Less than 0.1% failures
    'ws_message_roundtrip': ['p(95)<250', 'p(99)<500'],
    'ws_errors': ['count<50'],
    'sse_errors': ['count<50'],
  },
  summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
  console.log(`================================================================`);
  console.log(`🚀 BharatMarket 100k Realistic Mixed-Load Benchmark`);
  console.log(`🎯 Profile: 60% Browsing | 20% WS | 10% SSE | 5% Chat | 5% Churn`);
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

  if (roll < 0.60) {
    // 60% Browsing, Search, Pagination & Product Detail View
    const subRoll = Math.random();
    if (subRoll < 0.40) {
      runSearch();
    } else if (subRoll < 0.70) {
      runBrowsing();
    } else if (subRoll < 0.90) {
      runAdDetails();
    } else {
      testAdPagination(Math.floor(Math.random() * 5) + 1);
    }
  } else if (roll < 0.80) {
    // 20% WebSocket Active Chat Sockets (Socket.IO over WebSocket transport)
    runWebSocketChat(token, 12, 2);
  } else if (roll < 0.90) {
    // 10% SSE Notification Clients (Unbuffered event streams)
    runSSENotifications(token, 15);
  } else if (roll < 0.95) {
    // 5% REST Messaging, History, and Read Confirmations (Database Mutating)
    testConversationList(token);
    testMessageHistory(token);
    testSendMessage(token);
    testMarkConversationRead(token);
  } else {
    // 5% Reconnecting Churn & User Profile/Notification Syncs
    testUserProfile(token);
    testNotificationList(token);
  }
}

export function handleSummary(data) {
  return {
    stdout: generateBenchmarkSummary(data),
  };
}
