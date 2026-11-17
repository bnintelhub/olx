import { BASE_URL, SAMPLE_LOG_RATE } from '../config.js';
import { httpGet } from '../lib/helpers.js';

const SEARCH_TERMS = ['car', 'phone', 'bike', 'flat', 'laptop', 'furniture', 'electronics'];
const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc'];

/**
 * Scenario: Catalog Search & Filter Pipeline
 * Public discovery endpoint (unauthenticated)
 */
export function runSearch() {
  const query = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const sort = SORT_OPTIONS[Math.floor(Math.random() * SORT_OPTIONS.length)];
  const page = Math.floor(Math.random() * 3) + 1;
  const limit = 10;

  const url = `${BASE_URL}/api/v1/ads?q=${encodeURIComponent(query)}&sort=${sort}&page=${page}&limit=${limit}`;

  return httpGet(url, {
    tag: 'search',
    expectedStatus: 200,
    validateJson: true,
    sampleRate: SAMPLE_LOG_RATE,
  });
}
