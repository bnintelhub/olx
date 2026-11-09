import { sleep } from 'k6';
import { runSearch } from './scenarios/search.js';
import { runBrowsing } from './scenarios/browsing.js';
import { runAdDetails } from './scenarios/ads.js';
import { THRESHOLDS } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 500 },    // Warmup
    { duration: '1m', target: 2000 },    // Spike
    { duration: '30s', target: 5000 },   // Peak spike
    { duration: '1m', target: 500 },     // Recovery
  ],
  thresholds: THRESHOLDS,
};

export default function () {
  const roll = Math.random();
  if (roll < 0.6) {
    runSearch();
  } else if (roll < 0.85) {
    runBrowsing();
  } else {
    runAdDetails();
  }
  sleep(0.5);
}

