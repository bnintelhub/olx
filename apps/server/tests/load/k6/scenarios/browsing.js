import { BASE_URL, SAMPLE_LOG_RATE } from '../config.js';
import { httpGet } from '../lib/helpers.js';

/**
 * Scenario: Category Taxonomy & Hierarchy Browsing
 * Public discovery endpoint (unauthenticated)
 */
export function runBrowsing() {
  const isTree = Math.random() < 0.2; // 20% requests fetch full hierarchical tree
  const path = isTree ? '/api/v1/categories/tree' : '/api/v1/categories';
  const url = `${BASE_URL}${path}`;

  return httpGet(url, {
    tag: 'categories',
    expectedStatus: 200,
    validateJson: true,
    sampleRate: SAMPLE_LOG_RATE,
  });
}
