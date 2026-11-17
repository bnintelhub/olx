/**
 * Standalone ASCII Summary Generator for BharatMarket k6 Benchmarks
 * 
 * Formats a clean, readable, industrial-grade summary report directly in the terminal
 * when the benchmark completes, with zero external dependencies.
 */

function getMetricValue(metric, key = 'count', defaultValue = 0) {
  if (!metric || !metric.values) return defaultValue;
  const val = metric.values[key];
  return typeof val === 'number' ? val : defaultValue;
}

function formatNumber(num) {
  return Math.round(num).toLocaleString('en-IN');
}

function formatMs(ms) {
  if (ms === undefined || ms === null || isNaN(ms)) return '0.0ms';
  return `${ms.toFixed(1)}ms`;
}

function formatRate(rate) {
  if (rate === undefined || rate === null || isNaN(rate)) return '0.0%';
  return `${(rate * 100).toFixed(1)}%`;
}

function padRight(str, len) {
  str = String(str || '');
  while (str.length < len) str += ' ';
  return str;
}

function padLeft(str, len) {
  str = String(str || '');
  while (str.length < len) str = ' ' + str;
  return str;
}

export function generateBenchmarkSummary(data) {
  const metrics = data.metrics || {};

  // 1. Overall Requests & Success
  const totalHttp = getMetricValue(metrics.http_reqs, 'count', 0);
  const totalCustom = getMetricValue(metrics.total_requests, 'count', totalHttp);
  const totalReqs = Math.max(totalHttp, totalCustom);

  const successful = getMetricValue(metrics.successful_http_responses, 'count', 0);
  const failed = getMetricValue(metrics.failed_http_responses, 'count', totalReqs - successful);
  const validationErrs = getMetricValue(metrics.expected_response_failures, 'count', 0);

  const successPercent = totalReqs > 0 ? ((successful / totalReqs) * 100).toFixed(1) : '100.0';
  const failPercent = totalReqs > 0 ? ((failed / totalReqs) * 100).toFixed(1) : '0.0';

  // 2. HTTP Status Code Breakdown
  const c401 = getMetricValue(metrics.status_401_unauthorized, 'count', 0);
  const c403 = getMetricValue(metrics.status_403_forbidden, 'count', 0);
  const c404 = getMetricValue(metrics.status_404_not_found, 'count', 0);
  const c429 = getMetricValue(metrics.status_429_rate_limited, 'count', 0);
  const c5xx = getMetricValue(metrics.status_5xx_server_error, 'count', 0);
  const networkTimeouts = Math.max(0, failed - (c401 + c403 + c404 + c429 + c5xx));

  // 3. Global Latency
  const dur = metrics.http_req_duration || {};
  const globalAvg = getMetricValue(dur, 'avg', 0);
  const globalP95 = getMetricValue(dur, 'p(95)', 0);
  const globalP99 = getMetricValue(dur, 'p(99)', 0);
  const globalMax = getMetricValue(dur, 'max', 0);

  // 4. Endpoint Specific Stats
  const endpoints = [
    {
      name: 'Search Ads',
      latency: metrics.latency_search_ads,
      errorRate: metrics.error_rate_search_ads,
    },
    {
      name: 'Ads Feed',
      latency: metrics.latency_ads_list,
      errorRate: metrics.error_rate_ads_list,
    },
    {
      name: 'Browsing Categories',
      latency: metrics.latency_browsing_categories,
      errorRate: metrics.error_rate_browsing_categories,
    },
    {
      name: 'Messaging Probe',
      latency: metrics.latency_messaging_probe,
      errorRate: metrics.error_rate_messaging_probe,
    },
  ];

  // 5. Build Formatted Report
  const lines = [];
  lines.push('');
  lines.push('================================================================================');
  lines.push('📊 BHARATMARKET (OLX) — LOAD & PERFORMANCE BENCHMARK FINAL REPORT');
  lines.push('================================================================================');
  lines.push('');

  lines.push('📈 TRAFFIC & THROUGHPUT SUMMARY:');
  lines.push(`  • Total Requests Dispatched:  ${padLeft(formatNumber(totalReqs), 10)}`);
  lines.push(`  • Successful HTTP Responses:  ${padLeft(formatNumber(successful), 10)} (${successPercent}%)`);
  lines.push(`  • Failed HTTP / Timeouts:     ${padLeft(formatNumber(failed), 10)} (${failPercent}%)`);
  lines.push(`  • API Business Contract Errs: ${padLeft(formatNumber(validationErrs), 10)}`);
  lines.push('');

  lines.push('📋 HTTP STATUS CODE DISTRIBUTION:');
  lines.push(`  • HTTP 2xx (Success):         ${padLeft(formatNumber(successful), 10)}`);
  lines.push(`  • HTTP 401 (Unauthorized):   ${padLeft(formatNumber(c401), 10)}`);
  lines.push(`  • HTTP 403 (Forbidden):      ${padLeft(formatNumber(c403), 10)}`);
  lines.push(`  • HTTP 404 (Not Found):      ${padLeft(formatNumber(c404), 10)}`);
  lines.push(`  • HTTP 429 (Rate Limited):   ${padLeft(formatNumber(c429), 10)}`);
  lines.push(`  • HTTP 5xx (Server Error):   ${padLeft(formatNumber(c5xx), 10)}`);
  lines.push(`  • Network Timeouts / Resets:  ${padLeft(formatNumber(networkTimeouts), 10)}`);
  lines.push('');

  lines.push('⏱️ ENDPOINT LATENCY & ERROR BREAKDOWN:');
  lines.push('  ' + padRight('Endpoint', 22) + padLeft('Avg', 10) + padLeft('p95', 10) + padLeft('p99', 10) + padLeft('Max', 10) + padLeft('Err Rate', 11));
  lines.push('  ' + '─'.repeat(73));

  for (const ep of endpoints) {
    const avg = formatMs(getMetricValue(ep.latency, 'avg', 0));
    const p95 = formatMs(getMetricValue(ep.latency, 'p(95)', 0));
    const p99 = formatMs(getMetricValue(ep.latency, 'p(99)', 0));
    const max = formatMs(getMetricValue(ep.latency, 'max', 0));
    const errRate = formatRate(getMetricValue(ep.errorRate, 'rate', 0));

    lines.push('  ' + padRight(ep.name, 22) + padLeft(avg, 10) + padLeft(p95, 10) + padLeft(p99, 10) + padLeft(max, 10) + padLeft(errRate, 11));
  }
  lines.push('  ' + '─'.repeat(73));
  lines.push('  ' + padRight('OVERALL SYSTEM', 22) + padLeft(formatMs(globalAvg), 10) + padLeft(formatMs(globalP95), 10) + padLeft(formatMs(globalP99), 10) + padLeft(formatMs(globalMax), 10) + padLeft(failPercent + '%', 11));
  lines.push('');

  // 6. Thresholds Assessment
  const p95Pass = globalP95 < 400;
  const p99Pass = globalP99 < 800;
  const failPass = parseFloat(failPercent) < 5.0;
  const c5xxPass = c5xx < 10;

  lines.push('🎯 PRODUCTION SLI THRESHOLD EVALUATION:');
  lines.push(`  [${p95Pass ? 'PASS' : 'FAIL'}] Latency p95 < 400ms:          ${formatMs(globalP95)}`);
  lines.push(`  [${p99Pass ? 'PASS' : 'FAIL'}] Latency p99 < 800ms:          ${formatMs(globalP99)}`);
  lines.push(`  [${failPass ? 'PASS' : 'FAIL'}] Failed Request Rate < 5%:     ${failPercent}%`);
  lines.push(`  [${c5xxPass ? 'PASS' : 'FAIL'}] 5xx Server Crashes < 10:      ${c5xx} errors`);
  lines.push('');

  lines.push('💡 BREAKPOINT ANALYSIS & RECOMMENDATIONS:');
  if (networkTimeouts > 0 || !p95Pass) {
    lines.push('  • Peak Saturation Observed: The single Node.js container reached socket saturation');
    lines.push('    under high concurrency (2,000+ VUs).');
    lines.push('  • Next Step 1: Benchmark via Nginx gateway (http://nginx) to utilize pooled keepalive sockets.');
    lines.push('  • Next Step 2: Scale backend instances (e.g., docker compose up -d --scale server=3).');
  } else {
    lines.push('  • Excellent Stability: Backend handled all staged concurrency levels within target SLIs.');
  }
  lines.push('================================================================================');
  lines.push('');

  return lines.join('\n');
}
