import { Counter, Rate, Trend } from 'k6/metrics';

/**
 * Custom k6 Metrics Suite for BharatMarket Benchmark
 * 
 * Accurately tracks transport layer failures, status code distribution,
 * timeout/reset rates, business validation errors, and endpoint percentiles.
 */

// 1. Overall Request & Status Distribution Counters
export const totalRequests = new Counter('total_requests');
export const successfulResponses = new Counter('successful_http_responses'); // HTTP 2xx
export const failedResponses = new Counter('failed_http_responses');         // HTTP >= 400 or network error
export const validationFailures = new Counter('expected_response_failures'); // Business/JSON parsing errors

// 2. Specific HTTP Status Code Counters
export const status4xxCount = new Counter('status_4xx_client_error');
export const status401Count = new Counter('status_401_unauthorized');
export const status403Count = new Counter('status_403_forbidden');
export const status404Count = new Counter('status_404_not_found');
export const status429Count = new Counter('status_429_rate_limited');
export const status5xxCount = new Counter('status_5xx_server_error');
export const networkTimeouts = new Counter('network_timeouts');
export const connectionResets = new Counter('connection_resets');

// 3. Endpoint-Specific Latency Trends (tracks p50, p90, p95, p99 per endpoint)
export const latencySearch = new Trend('latency_search_ads', true);
export const latencyAds = new Trend('latency_ads_list', true);
export const latencyCategories = new Trend('latency_browsing_categories', true);
export const latencyMessaging = new Trend('latency_messaging_probe', true);

// 4. Endpoint-Specific Error Rates
export const errorRateSearch = new Rate('error_rate_search_ads');
export const errorRateAds = new Rate('error_rate_ads_list');
export const errorRateCategories = new Rate('error_rate_browsing_categories');
export const errorRateMessaging = new Rate('error_rate_messaging_probe');

/**
 * Record metrics for an executed HTTP request
 */
export function recordRequestMetrics(res, endpointTag, isBusinessValid = true) {
  totalRequests.add(1);

  const status = res ? res.status : 0;
  const isHttpSuccess = status >= 200 && status < 300;
  const isFailed = !isHttpSuccess;

  if (isHttpSuccess) {
    successfulResponses.add(1);
  } else {
    failedResponses.add(1);
  }

  // Track status code categories
  if (status >= 400 && status < 500) {
    status4xxCount.add(1);
    if (status === 401) status401Count.add(1);
    else if (status === 403) status403Count.add(1);
    else if (status === 404) status404Count.add(1);
    else if (status === 429) status429Count.add(1);
  } else if (status >= 500) {
    status5xxCount.add(1);
  } else if (status === 0) {
    // Network level timeout or socket reset
    const errStr = res && res.error ? String(res.error).toLowerCase() : '';
    if (errStr.includes('reset') || errStr.includes('refused')) {
      connectionResets.add(1);
    } else {
      networkTimeouts.add(1);
    }
  }

  if (!isBusinessValid) {
    validationFailures.add(1);
  }

  const duration = res && res.timings ? res.timings.duration : 0;
  const hasError = isFailed || !isBusinessValid;

  // Track endpoint specific metrics
  switch (endpointTag) {
    case 'search':
      latencySearch.add(duration);
      errorRateSearch.add(hasError);
      break;
    case 'ads':
      latencyAds.add(duration);
      errorRateAds.add(hasError);
      break;
    case 'categories':
      latencyCategories.add(duration);
      errorRateCategories.add(hasError);
      break;
    case 'messaging':
      latencyMessaging.add(duration);
      errorRateMessaging.add(hasError);
      break;
    default:
      break;
  }
}
