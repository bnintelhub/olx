import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';
import { recordRequestMetrics } from './metrics.js';

// Per-VU failure tracking variables
let vuFailureCount = 0;
let lastLogTimestamp = 0;
let totalLoggedSamples = 0;

const MAX_LOGGED_SAMPLES = 8; // Absolute hard cap across all logging
const LOG_COOLDOWN_MS = 2500;  // Minimum 2.5s between log entries

/**
 * Sampled error logger: Prevents console buffer overflow and CPU lockup
 * during benchmarks running at thousands of requests per second.
 * 
 * Rules:
 * - Only Virtual User 1 (__VU === 1) logs to avoid multiplying logs across thousands of VUs.
 * - Rate-limited to at most once per 2.5 seconds.
 * - Capped at MAX_LOGGED_SAMPLES total log statements per test execution.
 */
export function logSampledError(res, tag, errorMsg = '', sampleRate = 100) {
  // Suppress all VUs except VU 1 to prevent log multiplication
  if (typeof __VU !== 'undefined' && __VU > 1) {
    return;
  }

  vuFailureCount++;
  const now = Date.now();

  if (totalLoggedSamples >= MAX_LOGGED_SAMPLES) {
    return;
  }

  if (now - lastLogTimestamp < LOG_COOLDOWN_MS) {
    return;
  }

  totalLoggedSamples++;
  lastLogTimestamp = now;

  const status = res ? res.status : 0;
  const url = res ? res.url : 'unknown';
  const duration = res && res.timings ? `${Math.round(res.timings.duration)}ms` : '0ms';
  let bodySnippet = 'empty';

  try {
    if (res && res.body) {
      bodySnippet = typeof res.body === 'string'
        ? res.body.slice(0, 150).replace(/\r?\n|\r/g, ' ')
        : JSON.stringify(res.body).slice(0, 150);
    }
  } catch (_) {}

  console.warn(
    `[FAIL SAMPLE #${totalLoggedSamples}] [${tag}] HTTP ${status} (${duration}) | URL: ${url} | Detail: ${errorMsg || (status === 0 ? 'Network/DNS Connection Failed' : 'Non-2xx status')} | Snippet: ${bodySnippet}`
  );
}

/**
 * Pre-flight connectivity verification.
 * Probes the target server once before any virtual users are scheduled.
 * If unreachable (HTTP 0), aborts the test immediately to prevent infinite log loops.
 */
export function verifyTargetReachable(baseUrl) {
  console.log(`🔍 [Preflight] Probing target server: ${baseUrl}/health ...`);

  try {
    const probe = http.get(`${baseUrl}/health`, {
      tags: { name: 'preflight_health_check' },
      timeout: '4s',
    });

    if (probe.status === 0) {
      console.error(`\n❌ [Preflight Probe FAILED] Cannot reach "${baseUrl}" (HTTP 0 - Connection Refused / DNS Error).`);
      console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.error(`👉 Troubleshooting Guide for Codespaces / Docker:`);
      console.error(`   1. If using Codespaces with '--network host':`);
      console.error(`      Use: TARGET_URL=http://localhost:5000 (or http://localhost)`);
      console.error(`      Do NOT use 'http://server:5000' with host networking.`);
      console.error(`   2. If using Docker container network ('--network bharatmarket_net'):`);
      console.error(`      Use: TARGET_URL=http://backend:5000 or TARGET_URL=http://server:5000`);
      console.error(`   3. Verify backend container is running:`);
      console.error(`      Run: 'docker ps' or 'docker compose logs server'`);
      console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      exec.test.abort(`Target ${baseUrl} is offline or unreachable (HTTP 0).`);
      return false;
    }

    console.log(`✅ [Preflight] Target server is ONLINE and responding (HTTP ${probe.status}).`);
    return true;
  } catch (err) {
    console.error(`\n❌ [Preflight Exception] ${err.message}`);
    exec.test.abort(`Preflight exception connecting to ${baseUrl}: ${err.message}`);
    return false;
  }
}

/**
 * Authenticate a user and acquire a valid Bearer JWT access token.
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
    console.warn(`⚠️ [Auth Setup] Failed to authenticate user (${email}): HTTP ${res.status}`);
  } catch (err) {
    console.warn(`⚠️ [Auth Setup] Exception during authentication: ${err.message}`);
  }

  return null;
}

/**
 * Production-grade HTTP Request Dispatcher
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

  // 5. Detect and log extreme latency outliers (> 3,000ms) with Server-Timing diagnostics
  const duration = res && res.timings ? res.timings.duration : 0;
  if (duration > 3000) {
    const serverTiming = res.headers ? (res.headers['Server-Timing'] || res.headers['server-timing'] || 'none') : 'none';
    console.warn(
      `🚨 [LATENCY OUTLIER ${Math.round(duration)}ms] [${tag}] HTTP ${res.status} | URL: ${url} | Server-Timing: ${serverTiming}`
    );
  }

  // 6. Sampled Failure Logging (Strictly throttled to prevent spam)
  if (!passed) {
    logSampledError(res, tag, validationError, sampleRate);
  }

  return res;
}

export function httpGet(url, options = {}) {
  return executeRequest('GET', url, options);
}

export function httpPost(url, body, options = {}) {
  return executeRequest('POST', url, { ...options, body });
}
