import { sleep } from 'k6';
import { runSearch } from './scenarios/search.js';
import { runBrowsing } from './scenarios/browsing.js';
import { runAdDetails } from './scenarios/ads.js';
import { runMessaging } from './scenarios/messaging.js';
import { THRESHOLDS } from './config.js';

export const options = {
  stages: [
    { duration: '1m', target: 500 },     // Baseline
    { duration: '2m', target: 2000 },    // Medium
    { duration: '3m', target: 5000 },    // Heavy
    { duration: '2m', target: 10000 },   // Near Peak
    { duration: '2m', target: 0 },       // Cooldown
  ],
  thresholds: THRESHOLDS,
};

export default function () {
  const roll = Math.random();
  if (roll < 0.6) {
    runSearch();
  } else if (roll < 0.8) {
    runBrowsing();
  } else if (roll < 0.95) {
    runAdDetails();
  } else {
    runMessaging();
  }
  sleep(1);
}

