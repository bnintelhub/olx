import { sleep } from 'k6';
import { runSearch } from './scenarios/search.js';
import { runBrowsing } from './scenarios/browsing.js';
import { runAdDetails } from './scenarios/ads.js';
import { runMessaging } from './scenarios/messaging.js';
import { BASE_URL, AUTH_CREDENTIALS, THRESHOLDS } from './config.js';
import { authenticateUser } from './lib/helpers.js';

export const options = {
  stages: [
    { duration: '30s', target: 500 },    // Baseline
    { duration: '30s', target: 2000 },   // Instant surge
    { duration: '1m',  target: 5000 },   // Peak spike
    { duration: '30s', target: 500 },    // Quick recovery
    { duration: '30s', target: 0 },      // Ramp down
  ],
  thresholds: THRESHOLDS,
};

export function setup() {
  let token = null;
  if (AUTH_CREDENTIALS.email && AUTH_CREDENTIALS.password) {
    token = authenticateUser(BASE_URL, AUTH_CREDENTIALS.email, AUTH_CREDENTIALS.password);
  }
  return { token };
}

export default function (data) {
  const token = data ? data.token : null;
  const roll = Math.random();

  if (roll < 0.55) {
    runSearch();
  } else if (roll < 0.80) {
    runBrowsing();
  } else if (roll < 0.92) {
    runAdDetails();
  } else {
    runMessaging(token);
  }

  sleep(0.2);
}
