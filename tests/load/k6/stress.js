import { sleep } from 'k6';
import { runSearch } from './scenarios/search.js';
import { runBrowsing } from './scenarios/browsing.js';
import { runAdDetails } from './scenarios/ads.js';
import { runMessaging } from './scenarios/messaging.js';
import { BASE_URL, AUTH_CREDENTIALS, THRESHOLDS } from './config.js';
import { authenticateUser, verifyTargetReachable } from './lib/helpers.js';

/**
 * BharatMarket Production Staged Breakpoint Load Test
 * 
 * 7-Stage Realistic VU Progression:
 *   Stage 1: 100 VUs    (Warmup & Baseline)
 *   Stage 2: 250 VUs    (Light Production Traffic)
 *   Stage 3: 500 VUs    (Normal Peak Traffic)
 *   Stage 4: 1,000 VUs  (Rush Hour Surge)
 *   Stage 5: 2,000 VUs  (Marketing Campaign Surge)
 *   Stage 6: 5,000 VUs  (Heavy Festival Spike)
 *   Stage 7: 10,000 VUs (Peak Saturation & Breakpoint Probe)
 *   Stage 8: Cooldown   (Recovery)
 */
export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Stage 1: 100 VUs
    { duration: '30s', target: 250 },   // Stage 2: 250 VUs
    { duration: '1m',  target: 500 },   // Stage 3: 500 VUs
    { duration: '1m',  target: 1000 },  // Stage 4: 1,000 VUs
    { duration: '2m',  target: 2000 },  // Stage 5: 2,000 VUs
    { duration: '2m',  target: 5000 },  // Stage 6: 5,000 VUs
    { duration: '2m',  target: 10000 }, // Stage 7: 10,000 VUs Breakpoint
    { duration: '1m',  target: 0 },     // Stage 8: Cooldown & Recovery
  ],
  thresholds: THRESHOLDS,
};

/**
 * Setup Phase: Executes once before VUs start.
 * Acquires a valid user token if credentials are provided in environment.
 */
export function setup() {
  console.log(`================================================================`);
  console.log(`🚀 Starting BharatMarket k6 Breakpoint Load Benchmark`);
  console.log(`🎯 Target Base URL: ${BASE_URL}`);
  console.log(`================================================================`);

  // Verify connectivity before dispatching any VUs
  verifyTargetReachable(BASE_URL);

  let token = null;
  if (AUTH_CREDENTIALS.email && AUTH_CREDENTIALS.password) {
    token = authenticateUser(BASE_URL, AUTH_CREDENTIALS.email, AUTH_CREDENTIALS.password);
  } else {
    console.log(`ℹ️ [Auth Setup] No TEST_USER_EMAIL/TEST_USER_PASSWORD provided. Running public discovery + health probe.`);
  }

  return { token };
}

/**
 * Main VU Iteration Function
 */
export default function (data) {
  const token = data ? data.token : null;
  const roll = Math.random();

  if (roll < 0.50) {
    // 50% Catalog search and filtering
    runSearch();
  } else if (roll < 0.75) {
    // 25% Category taxonomy browsing
    runBrowsing();
  } else if (roll < 0.90) {
    // 15% Ad discovery & suggestions
    runAdDetails();
  } else {
    // 10% Chat & messaging interactions
    runMessaging(token);
  }

  // Realistic human think time between user actions (300ms - 800ms)
  sleep(0.3 + Math.random() * 0.5);
}
