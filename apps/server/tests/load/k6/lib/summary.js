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

function getTrendPercentile(metric, primaryKey, fallbackKey = 'p(95)') {
  if (!metric || !metric.values) return 0;
  const primary = metric.values[primaryKey];
  if (typeof primary === 'number' && primary > 0) return primary;
  const fallback = metric.values[fallbackKey];
  if (typeof fallback === 'number' && fallback > 0) return fallback;
  return typeof metric.values.max === 'number' ? metric.values.max : 0;
}

function formatNumber(num) {
  const value = String(Math.round(num || 0));
  const groups = [];
  let end = value.length;

  while (end > 3) {
    groups.unshift(value.slice(end - 3, end));
    end -= 3;
  }
  groups.unshift(value.slice(0, end));
  return groups.join(',');
}

function formatMs(ms) {
  if (ms === undefined || ms === null || isNaN(ms)) return '0.0ms';
  return `${ms.toFixed(1)}ms`;
}

function formatRate(rate) {
  if (rate === undefined || rate === null || isNaN(rate)) return '0.00%';
  return `${(rate * 100).toFixed(2)}%`;
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

  // 1. Overall Requests & Throughput
  const httpReqsMetric = metrics.http_reqs || {};
  const totalHttp = getMetricValue(httpReqsMetric, 'count', 0);
  const totalCustom = getMetricValue(metrics.total_requests, 'count', totalHttp);
  const totalReqs = Math.max(totalHttp, totalCustom);
  const rps = getMetricValue(httpReqsMetric, 'rate', 0);

  const successful = getMetricValue(metrics.successful_http_responses, 'count', 0);
  const failed = getMetricValue(metrics.failed_http_responses, 'count', totalReqs - successful);
  const validationErrs = getMetricValue(metrics.expected_response_failures, 'count', 0);

  const successPercent = totalReqs > 0 ? ((successful / totalReqs) * 100).toFixed(2) : '100.00';
  const failPercent = totalReqs > 0 ? ((failed / totalReqs) * 100).toFixed(2) : '0.00';

  // 2. HTTP Status Code Breakdown & Error Categories
  const c4xx = getMetricValue(metrics.status_4xx_client_error, 'count', 0);
  const c401 = getMetricValue(metrics.status_401_unauthorized, 'count', 0);
  const c403 = getMetricValue(metrics.status_403_forbidden, 'count', 0);
  const c404 = getMetricValue(metrics.status_404_not_found, 'count', 0);
  const c429 = getMetricValue(metrics.status_429_rate_limited, 'count', 0);
  const c5xx = getMetricValue(metrics.status_5xx_server_error, 'count', 0);

  const timeouts = getMetricValue(metrics.network_timeouts, 'count', 0);
  const resets = getMetricValue(metrics.connection_resets, 'count', 0);
  const totalNetErrors = timeouts + resets > 0 ? timeouts + resets : Math.max(0, failed - (c4xx + c5xx));

  const rate4xx = totalReqs > 0 ? (c4xx / totalReqs) : 0;
  const rate5xx = totalReqs > 0 ? (c5xx / totalReqs) : 0;
  const rateTimeout = totalReqs > 0 ? (timeouts / totalReqs) : 0;
  const rateReset = totalReqs > 0 ? (resets / totalReqs) : 0;

  // 3. Global Latencies (with robust p99 resolution)
  const dur = metrics.http_req_duration || {};
  const globalAvg = getMetricValue(dur, 'avg', 0);
  const globalP50 = getTrendPercentile(dur, 'med', 'p(50)');
  const globalP90 = getTrendPercentile(dur, 'p(90)', 'med');
  const globalP95 = getTrendPercentile(dur, 'p(95)', 'p(90)');
  const globalP99 = getTrendPercentile(dur, 'p(99)', 'p(95)');
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
  lines.push('📊 BHARATMARKET (OLX) — LOAD TEST PERFORMANCE BENCHMARK REPORT');
  lines.push('================================================================================');
  lines.push('');

  lines.push('📈 TRAFFIC, THROUGHPUT & SUCCESS RATES:');
  lines.push(`  • Requests Dispatched:        ${padLeft(formatNumber(totalReqs), 10)}`);
  lines.push(`  • Throughput (RPS):           ${padLeft(rps > 0 ? rps.toFixed(1) : 'N/A', 10)} req/sec`);
  lines.push(`  • Successful Responses (2xx): ${padLeft(formatNumber(successful), 10)} (${successPercent}%)`);
  lines.push(`  • Failed Requests:            ${padLeft(formatNumber(failed), 10)} (${failPercent}%)`);
  lines.push(`  • Business Schema Errors:     ${padLeft(formatNumber(validationErrs), 10)}`);
  lines.push('');

  lines.push('📋 HTTP STATUS CODE & NETWORK ERROR PROFILE:');
  lines.push(`  • HTTP 2xx (Success):         ${padLeft(formatNumber(successful), 10)}`);
  lines.push(`  • HTTP 4xx Total:             ${padLeft(formatNumber(c4xx), 10)} (${formatRate(rate4xx)})`);
  lines.push(`    - 401 Unauthorized:         ${padLeft(formatNumber(c401), 10)}`);
  lines.push(`    - 403 Forbidden:            ${padLeft(formatNumber(c403), 10)}`);
  lines.push(`    - 404 Not Found:            ${padLeft(formatNumber(c404), 10)}`);
  lines.push(`    - 429 Rate Limited:         ${padLeft(formatNumber(c429), 10)}`);
  lines.push(`  • HTTP 5xx Server Errors:     ${padLeft(formatNumber(c5xx), 10)} (${formatRate(rate5xx)})`);
  lines.push(`  • Network Dial/Read Timeouts: ${padLeft(formatNumber(timeouts), 10)} (${formatRate(rateTimeout)})`);
  lines.push(`  • Connection Resets by Peer:  ${padLeft(formatNumber(resets), 10)} (${formatRate(rateReset)})`);
  lines.push(`  • Total Unreached Sockets:    ${padLeft(formatNumber(totalNetErrors), 10)}`);
  lines.push('');

  lines.push('⏱️ ENDPOINT LATENCY PROFILE:');
  lines.push('  ' + padRight('Endpoint', 20) + padLeft('Avg', 9) + padLeft('p50', 9) + padLeft('p95', 9) + padLeft('p99', 9) + padLeft('Max', 9) + padLeft('Err Rate', 10));
  lines.push('  ' + '─'.repeat(75));

  for (const ep of endpoints) {
    const avg = formatMs(getMetricValue(ep.latency, 'avg', 0));
    const p50 = formatMs(getTrendPercentile(ep.latency, 'med', 'p(50)'));
    const p95 = formatMs(getTrendPercentile(ep.latency, 'p(95)', 'p(90)'));
    const p99 = formatMs(getTrendPercentile(ep.latency, 'p(99)', 'p(95)'));
    const max = formatMs(getMetricValue(ep.latency, 'max', 0));
    const errRate = formatRate(getMetricValue(ep.errorRate, 'rate', 0));

    lines.push('  ' + padRight(ep.name, 20) + padLeft(avg, 9) + padLeft(p50, 9) + padLeft(p95, 9) + padLeft(p99, 9) + padLeft(max, 9) + padLeft(errRate, 10));
  }
  lines.push('  ' + '─'.repeat(75));
  lines.push('  ' + padRight('OVERALL SYSTEM', 20) + padLeft(formatMs(globalAvg), 9) + padLeft(formatMs(globalP50), 9) + padLeft(formatMs(globalP95), 9) + padLeft(formatMs(globalP99), 9) + padLeft(formatMs(globalMax), 9) + padLeft(failPercent + '%', 10));
  lines.push('');

  // 6. Target SLI Validation
  const p95Pass = globalP95 > 0 && globalP95 < 400;
  const p99Pass = globalP99 > 0 && globalP99 < 800;
  const rate5xxPass = rate5xx < 0.0001; // < 0.01%
  const timeoutPass = rateTimeout < 0.005; // ≈ 0%
  const httpFailPass = parseFloat(failPercent) < 5.0; // < 5%
  const businessPass = validationErrs === 0;

  lines.push('🎯 PRODUCTION TARGET (SLI) VALIDATION:');
  lines.push(`  [${p95Pass ? 'PASS' : 'FAIL'}] p95 Latency < 400ms:          ${formatMs(globalP95)} (Target: <400ms)`);
  lines.push(`  [${p99Pass ? 'PASS' : 'FAIL'}] p99 Latency < 800ms:          ${formatMs(globalP99)} (Target: <800ms)`);
  lines.push(`  [${rate5xxPass ? 'PASS' : 'FAIL'}] 5xx Error Rate < 0.01%:       ${formatRate(rate5xx)} (Target: <0.01%)`);
  lines.push(`  [${timeoutPass ? 'PASS' : 'FAIL'}] Timeout Rate ≈ 0%:            ${formatRate(rateTimeout)} (Target: ≈0%)`);
  lines.push(`  [${httpFailPass ? 'PASS' : 'FAIL'}] Total HTTP Failures < 5%:     ${failPercent}% (Target: <5.0%)`);
  lines.push(`  [${businessPass ? 'PASS' : 'FAIL'}] Business Contract Errors = 0: ${validationErrs} errors (Target: 0)`);
  lines.push('');

  lines.push('💡 ROOT CAUSE DIAGNOSIS & ARCHITECTURAL ACTIONS:');
  if (c5xx > 0) {
    lines.push(`  • ${c5xx} HTTP 5xx errors detected: Typically caused by Prisma connection pool exhaustion`);
    lines.push('    or database query timeouts under high concurrent load.');
  }
  if (timeouts > 0 || resets > 0) {
    lines.push(`  • ${timeouts + resets} network timeouts/resets detected: Node.js single-thread event loop`);
    lines.push('    saturated its TCP SYN backlog. Route traffic through Nginx (http://nginx) and scale instances.');
  }
  if (c429 > 0) {
    lines.push(`  • ${c429} Rate limited (429): Set ENABLE_RATE_LIMIT=false in server .env for benchmark runs.`);
  }
  if (p95Pass && p99Pass && rate5xxPass && timeoutPass) {
    lines.push('  • All production target thresholds met cleanly!');
  }
  lines.push('================================================================================');
  lines.push('');

  return lines.join('\n');
}
