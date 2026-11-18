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
 * - 10% Notification Sync (SSE is available via ENABLE_SSE_PROBE=true)
 * - 5% High-Throughput REST Messaging & Read Operations (HTTP Write / DB Mutate)
 * - 5% Reconnecting Churn & Profile Synchronizations
 */
export const options = {
  // Retain bodies for JSON validation unless explicitly disabled
  discardResponseBodies: __ENV.DISCARD_BODIES === 'true',
  scenarios: {
    realistic_mixed_100k: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: parseInt(__ENV.PREALLOCATED_VUS || '10000', 10),
      maxVUs: parseInt(__ENV.MAX_VUS || '60000', 10),
      stages: [
        // Stage 1: 100 users/s (Warmup baseline)
        { duration: '30s', target: 100 },
        // Stage 2: 500 users/s
        { duration: '30s', target: 500 },
        // Stage 3: 1,000 users/s (Steady state)
        { duration: '45s', target: 1000 },
        // Stage 4: 2,500 users/s
        { duration: '45s', target: 2500 },
        // Stage 5: 5,000 users/s (Steady state)
        { duration: '1m', target: 5000 },
        // Stage 6: 10,000 users/s (10k milestone)
        { duration: '1m', target: 10000 },
        // Stage 7: 20,000 users/s
        { duration: '1m', target: 20000 },
        // Stage 8: 40,000 users/s
        { duration: '1m', target: 40000 },
        // Stage 9: 60,000 users/s
        { duration: '1m', target: 60000 },
        // Stage 10: 80,000 users/s
        { duration: '1m', target: 80000 },
        // Stage 11: 1,00,000 users/s (Full 100k Peak Load)
        { duration: '1m30s', target: 100000 },
        // Cooldown
        { duration: '30s', target: 1000 },
      ],
    },
  },
  thresholds: {
    ...THRESHOLDS,
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.05'], // Peak benchmark: allow up to 5% failures
    'ws_message_roundtrip': ['p(95)<500', 'p(99)<1000'],
    'ws_errors': ['count<50'],
    'sse_errors': ['count<50'],
  },
  summaryTrendStats: SUMMARY_TREND_STATS,
};

export function setup() {
  console.log(`================================================================`);
  console.log(`🚀 BharatMarket 100k Realistic Mixed-Load Benchmark`);
  console.log(`🎯 Profile: 60% Browsing | 20% WS | 10% Notifications | 5% Chat | 5% Churn`);
  console.log(`📡 Target Gateway: ${BASE_URL}`);
  console.log(`================================================================`);

  verifyTargetReachable(BASE_URL);

  let token = null;
  let conversationId = null;

  const email = AUTH_CREDENTIALS.email || 'rahul@gmail.com';
  const password = AUTH_CREDENTIALS.password || 'rahul@123';

  token = authenticateUser(BASE_URL, email, password);
  if (token) {
    console.log(`✅ [Auth] Acquired JWT session token for authenticated endpoints`);
    // Attempt to discover an existing conversation for message probing
    try {
      const convRes = testConversationList(token);
      if (convRes && convRes.status === 200) {
        const body = convRes.json();
        const items = body?.data?.conversations || body?.data || [];
        if (Array.isArray(items) && items.length > 0) {
          conversationId = items[0].id;
          console.log(`✅ [Chat Probe] Bound to active conversation: ${conversationId}`);
        }
      }
    } catch {
      // Continue without conversation binding
    }
  } else {
    console.warn(`⚠️ [Auth] Running without credentials. Authenticated routes will fallback to public probes.`);
  }

  return { token, conversationId };
}

export default function (data) {
  const token = data ? data.token : null;
  const conversationId = data ? data.conversationId : null;
  const roll = Math.random();

  if (roll < 0.60) {
    // 60% Browsing, Search, Pagination & Product Detail View (Public Endpoints)
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
    runWebSocketChat(token, 2, 1, conversationId);
  } else if (roll < 0.90) {
    // 10% Notification Sync (SSE is opt-in because k6 HTTP probes treat open streams as bounded timeouts)
    if (__ENV.ENABLE_SSE_PROBE === 'true' && token) {
      runSSENotifications(token, 2);
    } else if (token) {
      testNotificationList(token);
    } else {
      runSearch();
    }
  } else if (roll < 0.95) {
    // 5% REST Messaging, History, and Read Confirmations (Database Mutating)
    if (token) {
      testConversationList(token);
      if (conversationId) {
        testMessageHistory(token, conversationId);
        testSendMessage(token, conversationId);
        testMarkConversationRead(token, conversationId);
      }
    } else {
      runBrowsing(); // Fallback if unauthenticated
    }
  } else {
    // 5% Reconnecting Churn & User Profile/Notification Syncs
    if (token) {
      testUserProfile(token);
      testNotificationList(token);
    } else {
      runAdDetails(); // Fallback if unauthenticated
    }
  }
}

export function handleSummary(data) {
  return {
    stdout: generateBenchmarkSummary(data),
  };
}
