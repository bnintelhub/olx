import { BASE_URL, SAMPLE_LOG_RATE } from '../config.js';
import { httpGet } from '../lib/helpers.js';

/**
 * Scenario: Ad Feed & Discovery Listing
 * Public discovery endpoint (unauthenticated)
 */
export function runAdDetails() {
  const isSuggestion = Math.random() < 0.2; // 20% requests fetch autocomplete suggestions
  let url;

  if (isSuggestion) {
    url = `${BASE_URL}/api/v1/ads/suggestions?q=car&limit=8`;
  } else {
    const page = Math.floor(Math.random() * 2) + 1;
    url = `${BASE_URL}/api/v1/ads?limit=16&page=${page}&sort=newest`;
  }

  return httpGet(url, {
    tag: 'ads',
    expectedStatus: 200,
    validateJson: true,
    sampleRate: SAMPLE_LOG_RATE,
  });
}
