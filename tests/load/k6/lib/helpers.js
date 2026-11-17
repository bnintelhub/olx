import http from 'k6/http';
import { check } from 'k6';
import { recordRequestMetrics } from './metrics.js';

// Counter used for deterministic failure sampling
let failureCounter = 0;

/**
 * Sampled error logger: Prevents console buffer overflow and CPU lockup
 * during benchmarks running at thousands of requests per second.
 * 
 * Logs only 1 out of every `sampleRate` failures (default: 1 in 100).
 */
export function logSampledError(res, tag, errorMsg = '', sampleRate = 100) {
  failureCounter++;
  if (failureCounter % sampleRate === 1) {
    const status = res ? res.status : 0;
    const url = res ? res.url : 'unknown';
    const duration = res && res.timings ? `${Math.round(res.timings.duration)}ms` : '0ms';
    let bodySnippet = 'empty';

    try {
      if (res && res.body) {
        bodySnippet = typeof res.body === 'string'
          ? res.body.slice(0, 200).replace(/\r?\n|\r/g, ' ')
          : JSON.stringify(res.body).slice(0, 200);
      }
    } catch (_) {}

    console.warn(
      `[FAIL SAMPLE #${failureCounter}] Tag: [${tag}] | HTTP ${status} | Duration: ${duration} | URL: ${url} | Detail: ${errorMsg || 'Non-2xx status'} | Body: ${bodySnippet}`
    );
  }
}

/**
 * Authenticate a user and acquire a valid Bearer JWT access token.
 * 
 * @param {string} baseUrl - Target API root URL
 * @param {string} email - User account email
 * @param {string} password - User password
 * @returns {string|null} - Bearer access token or null on failure
 */
export function authenticateUser(baseUrl, email, password) {
  if (!email || !password) {
    return null;
  }

  const loginUrl = `${baseUrl}/api/v1/auth/login`;
  const payload = JSON.stringify({ email, password });
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-app-context': 'client',
  };

  try {
    const res = http.post(loginUrl, payload, { headers, tags: { name: 'auth_login' } });
    if (res.status === 200) {
      const data = res.json();
      const token = data && data.data && data.data.tokens ? data.data.tokens.accessToken : null;
      if (token) {
        console.log(`✅ [Auth Setup] Successfully acquired access token for: ${email}`);
        return token;
      }
    }
    console.warn(`⚠️ [Auth Setup] Failed to authenticate user (${email}): HTTP ${res.status} - ${res.body}`);
  } catch (err) {
    console.warn(`⚠️ [Auth Setup] Exception during authentication: ${err.message}`);
  }

  return null;
}

/**
 * Production-grade HTTP Request Dispatcher
 * 
 * Handles:
 * - Common headers injection
 * - Authorization Bearer token injection
 * - Request tagging
 * - Status code checking
 * - JSON and business response validation
 * - Custom metrics tracking
 * - High-speed sampled error logging
 */
export function executeRequest(method, url, options = {}) {
  const {
    body = null,
    token = null,
    tag = 'default',
    expectedStatus = 200,
    validateJson = true,
    extraHeaders = {},
    sampleRate = 100,
  } = options;

  const headers = {
    'Accept': 'application/json',
    ...extraHeaders,
  };

  if (body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const requestOptions = {
    headers,
    tags: {
      name: tag,
      endpoint: tag,
    },
  };

  const payload = body && typeof body === 'object' ? JSON.stringify(body) : body;
  let res;

  if (method.toUpperCase() === 'POST') {
    res = http.post(url, payload, requestOptions);
  } else if (method.toUpperCase() === 'PUT') {
    res = http.put(url, payload, requestOptions);
  } else if (method.toUpperCase() === 'DELETE') {
    res = http.del(url, payload, requestOptions);
  } else {
    res = http.get(url, requestOptions);
  }

  // 1. Status Code Validation
  const isStatusValid = res.status === expectedStatus;

  // 2. Business & JSON Validation
  let isBusinessValid = true;
  let validationError = '';

  if (validateJson && isStatusValid) {
    try {
      const json = res.json();
      if (!json) {
        isBusinessValid = false;
        validationError = 'Empty JSON payload';
      } else if (typeof json === 'object' && 'success' in json && json.success === false) {
        isBusinessValid = false;
        validationError = `API returned success: false (${json.error ? json.error.message || json.error.code : 'unknown'})`;
      }
    } catch (parseErr) {
      isBusinessValid = false;
      validationError = `JSON parse failed: ${parseErr.message}`;
    }
  }

  // 3. Register k6 Check
  const checkName = `${tag} (status ${expectedStatus})`;
  const passed = check(res, {
    [checkName]: () => isStatusValid && isBusinessValid,
  });

  // 4. Record Metrics
  recordRequestMetrics(res, tag, isBusinessValid);

  // 5. Sampled Failure Logging
  if (!passed) {
    logSampledError(res, tag, validationError, sampleRate);
  }

  return res;
}

/**
 * Convenience GET wrapper
 */
export function httpGet(url, options = {}) {
  return executeRequest('GET', url, options);
}

/**
 * Convenience POST wrapper
 */
export function httpPost(url, body, options = {}) {
  return executeRequest('POST', url, { ...options, body });
}
