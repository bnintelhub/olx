import { BASE_URL, SAMPLE_LOG_RATE } from '../config.js';
import { httpGet } from '../lib/helpers.js';

/**
 * Scenario: Messaging & Chat Probe
 * 
 * If a valid user token is provided:
 *   Calls authenticated user conversations endpoint (`/api/v1/chat/conversations`).
 * If no token is provided:
 *   Falls back to infrastructure health probe (`/health`), preventing 401 unauthenticated errors.
 */
export function runMessaging(token = null) {
  if (token) {
    // Authenticated user chat conversations list
    const url = `${BASE_URL}/api/v1/chat/conversations?limit=10`;
    return httpGet(url, {
      tag: 'messaging',
      token,
      expectedStatus: 200,
      validateJson: true,
      sampleRate: SAMPLE_LOG_RATE,
    });
  }

  // Fallback infrastructure liveness probe when running in unauthenticated mode
  const url = `${BASE_URL}/health`;
  return httpGet(url, {
    tag: 'messaging',
    expectedStatus: 200,
    validateJson: true,
    sampleRate: SAMPLE_LOG_RATE,
  });
}
