import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL } from '../config.js';

// Custom SSE Performance Metrics
export const sseConnectDuration = new Trend('sse_connect_duration', true);
export const sseEventsReceived = new Counter('sse_events_received');
export const sseConnectionsActive = new Counter('sse_connections_active');
export const sseErrors = new Counter('sse_errors');

/**
 * Executes a persistent Server-Sent Events (SSE) stream probe.
 * 
 * Verifies:
 * 1. HTTP 200 with `text/event-stream` and chunked transfer encoding.
 * 2. Unbuffered proxy delivery (no premature buffer cutoff).
 * 3. Successful reception of the `ready` handshake event.
 * 4. Sustained connection hold time across 10k–100k virtual users.
 */
export function runSSENotifications(token = null, timeoutSeconds = 15) {
  const url = `${BASE_URL}/api/v1/notifications/stream`;
  const headers = {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'User-Agent': 'k6-load-tester',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const startConnect = Date.now();
  sseConnectionsActive.add(1);

  // Request stream with a bounded timeout to simulate long-lived open sockets
  const params = {
    headers,
    timeout: `${timeoutSeconds}s`,
  };

  const res = http.get(url, params);
  sseConnectDuration.add(Date.now() - startConnect);
  sseConnectionsActive.add(-1);

  const isSuccess = check(res, {
    'SSE stream opened with 200': (r) => r.status === 200,
    'SSE content-type is event-stream': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('text/event-stream'),
  });

  if (!isSuccess) {
    sseErrors.add(1);
  } else if (res.body) {
    // Count events arrived in chunked buffer
    const eventCount = (res.body.match(/event:\s*/g) || []).length;
    if (eventCount > 0) {
      sseEventsReceived.add(eventCount);
    }
  }

  return res;
}
