import { performance } from 'node:perf_hooks';

interface LoadTestOptions {
  baseUrl: string;
  endpoint: string;
  concurrency: number;
  durationSeconds: number;
}

interface RequestResult {
  durationMs: number;
  status: number;
  ok: boolean;
  error?: string;
}

interface BenchmarkReport {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  durationSeconds: number;
  requestsPerSecond: number;
  latencyAvg: number;
  latencyMin: number;
  latencyMax: number;
  latencyP50: number;
  latencyP90: number;
  latencyP95: number;
  latencyP99: number;
  statusCodes: Record<number, number>;
}

function parseCliArgs(): LoadTestOptions {
  const args = process.argv.slice(2);
  const options: LoadTestOptions = {
    baseUrl: process.env.TARGET_URL || 'http://localhost:5000',
    endpoint: '/api/v1/health',
    concurrency: 50,
    durationSeconds: 10,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--url' && args[i + 1]) {
      options.baseUrl = args[++i];
    } else if ((arg === '--concurrency' || arg === '-c') && args[i + 1]) {
      options.concurrency = parseInt(args[++i], 10) || 50;
    } else if ((arg === '--duration' || arg === '-d') && args[i + 1]) {
      options.durationSeconds = parseInt(args[++i], 10) || 10;
    } else if ((arg === '--endpoint' || arg === '-e') && args[i + 1]) {
      options.endpoint = args[++i];
    }
  }

  return options;
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const index = Math.min(
    Math.floor((percentile / 100) * values.length),
    values.length - 1
  );
  return values[index];
}

async function runWorker(
  url: string,
  stopAt: number,
  results: RequestResult[]
): Promise<void> {
  while (performance.now() < stopAt) {
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const durationMs = performance.now() - start;
      results.push({
        durationMs,
        status: res.status,
        ok: res.ok,
      });
    } catch (err: any) {
      const durationMs = performance.now() - start;
      results.push({
        durationMs,
        status: 0,
        ok: false,
        error: err.message || 'Network error',
      });
    }
  }
}

async function benchmarkEndpoint(
  baseUrl: string,
  endpoint: string,
  concurrency: number,
  durationSeconds: number
): Promise<BenchmarkReport> {
  const fullUrl = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
  console.log(`\n======================================================`);
  console.log(`🚀 Benchmarking: ${fullUrl}`);
  console.log(`⚡ Concurrency: ${concurrency} parallel clients`);
  console.log(`⏱️ Duration: ${durationSeconds} seconds`);
  console.log(`======================================================`);

  const results: RequestResult[] = [];
  const startOverall = performance.now();
  const stopAt = startOverall + durationSeconds * 1000;

  const workers = Array.from({ length: concurrency }, () =>
    runWorker(fullUrl, stopAt, results)
  );

  await Promise.all(workers);
  const totalDurationSeconds = (performance.now() - startOverall) / 1000;

  const latencies = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const successful = results.filter((r) => r.ok).length;
  const failed = results.length - successful;

  const statusCodes: Record<number, number> = {};
  for (const r of results) {
    statusCodes[r.status] = (statusCodes[r.status] || 0) + 1;
  }

  const sumLatency = latencies.reduce((acc, val) => acc + val, 0);
  const avgLatency = latencies.length ? sumLatency / latencies.length : 0;

  return {
    endpoint,
    totalRequests: results.length,
    successfulRequests: successful,
    failedRequests: failed,
    durationSeconds: totalDurationSeconds,
    requestsPerSecond: Math.round(results.length / totalDurationSeconds),
    latencyAvg: Math.round(avgLatency * 100) / 100,
    latencyMin: Math.round((latencies[0] || 0) * 100) / 100,
    latencyMax: Math.round((latencies[latencies.length - 1] || 0) * 100) / 100,
    latencyP50: Math.round(calculatePercentile(latencies, 50) * 100) / 100,
    latencyP90: Math.round(calculatePercentile(latencies, 90) * 100) / 100,
    latencyP95: Math.round(calculatePercentile(latencies, 95) * 100) / 100,
    latencyP99: Math.round(calculatePercentile(latencies, 99) * 100) / 100,
    statusCodes,
  };
}

function printReport(report: BenchmarkReport): void {
  console.log(`\n📊 LOAD TEST RESULTS: ${report.endpoint}`);
  console.log(`------------------------------------------------------`);
  console.log(`Total Requests:    ${report.totalRequests.toLocaleString('en-IN')}`);
  console.log(`Success Count:     ${report.successfulRequests.toLocaleString('en-IN')} (${((report.successfulRequests / (report.totalRequests || 1)) * 100).toFixed(1)}%)`);
  console.log(`Failed Count:      ${report.failedRequests.toLocaleString('en-IN')}`);
  console.log(`Throughput:        ${report.requestsPerSecond.toLocaleString('en-IN')} req/sec`);
  console.log(`\n⏱️ LATENCY DISTRIBUTION:`);
  console.log(`  Min:   ${report.latencyMin} ms`);
  console.log(`  Avg:   ${report.latencyAvg} ms`);
  console.log(`  p50:   ${report.latencyP50} ms`);
  console.log(`  p90:   ${report.latencyP90} ms`);
  console.log(`  p95:   ${report.latencyP95} ms`);
  console.log(`  p99:   ${report.latencyP99} ms`);
  console.log(`  Max:   ${report.latencyMax} ms`);
  console.log(`\n📋 HTTP STATUS CODES:`);
  for (const [code, count] of Object.entries(report.statusCodes)) {
    const label = code === '0' ? 'Connection Error' : `HTTP ${code}`;
    console.log(`  ${label}: ${count}`);
  }
  console.log(`======================================================\n`);
}

async function main(): Promise<void> {
  const options = parseCliArgs();

  // If specific endpoint passed, run single benchmark
  if (process.argv.includes('--endpoint') || process.argv.includes('-e')) {
    const report = await benchmarkEndpoint(
      options.baseUrl,
      options.endpoint,
      options.concurrency,
      options.durationSeconds
    );
    printReport(report);
    return;
  }

  // Default suite of critical endpoints
  const endpoints = [
    '/api/v1/health',
    '/api/v1/categories',
    '/api/v1/ads',
  ];

  console.log(`🔥 Starting OLX API Load Testing Suite 🔥`);
  for (const ep of endpoints) {
    try {
      const report = await benchmarkEndpoint(
        options.baseUrl,
        ep,
        options.concurrency,
        options.durationSeconds
      );
      printReport(report);
    } catch (err) {
      console.error(`Failed benchmarking ${ep}:`, err);
    }
  }
}

void main();
