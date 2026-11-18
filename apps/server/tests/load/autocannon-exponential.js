#!/usr/bin/env node
/**
 * ============================================================================
 * BharatMarket (OLX) — 1 Lakh (100,000) Exponential Load Testing Suite
 * ============================================================================
 * 
 * Optimized specifically for GitHub Codespaces and Linux VPS environments.
 * Uses Autocannon with Multi-Worker Threads & Pipelined Connection Pooling
 * to simulate up to 100,000 concurrent in-flight requests without exhausting
 * OS socket limits.
 * 
 * Stages:
 *   Stage 1:   100  Concurrent Users (Warmup & Baseline)
 *   Stage 2:   500  Concurrent Users (Light Production Traffic)
 *   Stage 3: 2,000  Concurrent Users (Medium Traffic)
 *   Stage 4: 10,000 Concurrent Users (Rush Hour Spike)
 *   Stage 5: 25,000 Concurrent Users (Flash Sale / Festival Spike)
 *   Stage 6: 50,000 Concurrent Users (Heavy Stress Surge)
 *   Stage 7: 100,000 Concurrent Users (1 Lakh Target Peak & Breakpoint)
 * 
 * Usage:
 *   node tests/load/autocannon-exponential.js [TARGET_URL]
 * Examples:
 *   node tests/load/autocannon-exponential.js http://localhost/health
 *   node tests/load/autocannon-exponential.js http://localhost/api/v1/ads?limit=16
 *   node tests/load/autocannon-exponential.js http://localhost:5000/api/v1/health
 */

const { execSync } = require('child_process');
const os = require('os');

// Determine target URL from CLI arguments or environment
const args = process.argv.slice(2);
let targetUrl = 'http://localhost/health';

if (args[0] && !args[0].startsWith('--')) {
  targetUrl = args[0];
} else if (process.env.TARGET_URL) {
  targetUrl = process.env.TARGET_URL;
}

// Detect CPU cores for optimal multi-threaded workers
const numCores = Math.max(1, os.cpus().length || 2);
const workers = Math.min(numCores, 4);

/**
 * 7 Exponential Stages up to 1 Lakh (100,000) Concurrent In-Flight Load:
 * Connections × Pipelining = Total Concurrent In-Flight Requests
 */
const stages = [
  {
    targetConcurrency: '100',
    connections: 50,
    pipelining: 2,
    duration: 10,
    label: 'Stage 1: Warmup & Baseline'
  },
  {
    targetConcurrency: '500',
    connections: 100,
    pipelining: 5,
    duration: 12,
    label: 'Stage 2: Light Traffic'
  },
  {
    targetConcurrency: '2,000',
    connections: 200,
    pipelining: 10,
    duration: 15,
    label: 'Stage 3: Medium Traffic'
  },
  {
    targetConcurrency: '10,000',
    connections: 500,
    pipelining: 20,
    duration: 18,
    label: 'Stage 4: Rush Hour Surge'
  },
  {
    targetConcurrency: '25,000',
    connections: 1250,
    pipelining: 20,
    duration: 20,
    label: 'Stage 5: High-Density Spike'
  },
  {
    targetConcurrency: '50,000',
    connections: 2500,
    pipelining: 20,
    duration: 25,
    label: 'Stage 6: Heavy Enterprise Stress'
  },
  {
    targetConcurrency: '100,000 (1 Lakh)',
    connections: 5000,
    pipelining: 20,
    duration: 30,
    label: 'Stage 7: 1 Lakh Peak Concurrency & Breakpoint'
  }
];

console.log('================================================================');
console.log('🚀 BharatMarket — 1 Lakh (100,000) Exponential Load Benchmark');
console.log('================================================================');
console.log(`📡 Target URL       : ${targetUrl}`);
console.log(`💻 Codespace Cores  : ${numCores} Cores detected (Allocating ${workers} Workers)`);
console.log(`📈 Planned Stages   : 7 Stages (100 -> 500 -> 2k -> 10k -> 25k -> 50k -> 1 Lakh)`);
console.log('================================================================\n');

// Results aggregator
const results = [];

for (let i = 0; i < stages.length; i++) {
  const stage = stages[i];
  console.log(`\n----------------------------------------------------------------`);
  console.log(`🔥 [Stage ${i + 1}/7] ${stage.label}`);
  console.log(`⚡ Target Concurrency : ${stage.targetConcurrency} In-Flight Requests`);
  console.log(`⚙️  Raw Sockets       : ${stage.connections} connections × ${stage.pipelining} pipelining`);
  console.log(`⏱️  Duration          : ${stage.duration} seconds`);
  console.log(`----------------------------------------------------------------\n`);

  // Build optimized Autocannon command
  // Using npx autocannon with workers, pipelining, and status codes rendering
  const cmd = `npx --yes autocannon -c ${stage.connections} -p ${stage.pipelining} -d ${stage.duration} -w ${workers} --renderStatusCodes -l ${targetUrl}`;

  const startTime = Date.now();
  try {
    execSync(cmd, { stdio: 'inherit' });
    results.push({
      stage: i + 1,
      target: stage.targetConcurrency,
      status: 'PASSED',
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
    });
  } catch (err) {
    console.warn(`\n⚠️  [Stage ${i + 1}] Alert: Server reached saturation or connections dropped.`);
    results.push({
      stage: i + 1,
      target: stage.targetConcurrency,
      status: 'SATURATED / THROTTLED',
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
    });

    // Ask or break if severely failing
    console.log(`Proceeding to next stage in 3 seconds to measure recovery...\n`);
    try {
      execSync('sleep 3 2>/dev/null || timeout 3 >nul 2>&1');
    } catch (_) {}
  }
}

console.log('\n================================================================');
console.log('📊 1 Lakh Exponential Load Test Summary Report');
console.log('================================================================');
console.table(results);
console.log('================================================================');
console.log('💡 Architectural Insights:');
console.log('- If Latency p99 stays < 200ms up to 25k, your Fastify event loop is healthy.');
console.log('- If errors appear at 50k or 100k on 1 server container, scale horizontally:');
console.log('    docker compose -f docker-compose.prod.yml up -d --scale server=3');
console.log('================================================================\n');

