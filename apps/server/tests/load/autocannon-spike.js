#!/usr/bin/env node
/**
 * ============================================================================
 * BharatMarket (OLX) — Autocannon Traffic Spike & Burst Benchmark
 * ============================================================================
 * 
 * Simulates a sudden flash-sale traffic surge:
 *   - Warmup: 500 in-flight requests
 *   - Baseline: 2,000 in-flight requests
 *   - SPIKE: 50,000 in-flight requests within 15 seconds
 *   - PEAK SPIKE: 100,000 in-flight requests
 *   - Normalization & Recovery
 */

const { execSync } = require('child_process');
const os = require('os');

const args = process.argv.slice(2);
const rawTarget = args[0] || process.env.TARGET_URL || 'http://localhost/api/v1/ads?limit=16';
const targetUrl = rawTarget.replace(/\/+$/, '');

const numCores = Math.max(1, os.cpus().length || 2);
const workers = Math.min(numCores, 4);

const spikeStages = [
  { label: 'Stage 1: Pre-warm Baseline', connections: 100, pipelining: 5, duration: 10 },
  { label: 'Stage 2: Medium Load', connections: 250, pipelining: 10, duration: 12 },
  { label: 'Stage 3: 💥 FLASH SPIKE (50k In-Flight)', connections: 2500, pipelining: 20, duration: 20 },
  { label: 'Stage 4: ⚡ EXTREME PEAK (100k In-Flight)', connections: 5000, pipelining: 20, duration: 25 },
  { label: 'Stage 5: Recovery & Normalization', connections: 100, pipelining: 5, duration: 10 },
];

console.log('================================================================');
console.log('💥 BharatMarket — Autocannon Traffic Spike Benchmark');
console.log('================================================================');
console.log(`📡 Target Endpoint  : ${targetUrl}`);
console.log(`💻 CPU Cores        : ${numCores} Cores (${workers} Workers allocated)`);
console.log('================================================================\n');

for (let i = 0; i < spikeStages.length; i++) {
  const stage = spikeStages[i];
  const inFlight = stage.connections * stage.pipelining;
  console.log(`----------------------------------------------------------------`);
  console.log(`🚀 [${i + 1}/${spikeStages.length}] ${stage.label}`);
  console.log(`⚡ Concurrency : ${inFlight.toLocaleString()} In-Flight (${stage.connections} conns × ${stage.pipelining} pipe)`);
  console.log(`⏱️  Duration    : ${stage.duration} seconds`);
  console.log(`----------------------------------------------------------------\n`);

  const cmd = `npx --yes autocannon -c ${stage.connections} -p ${stage.pipelining} -d ${stage.duration} -w ${workers} --renderStatusCodes -l "${targetUrl}"`;

  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    console.warn(`\n⚠️  [${stage.label}] Connection limit reached or throttled.`);
  }

  console.log('\nResting 2 seconds...\n');
  try {
    execSync('sleep 2 2>/dev/null || timeout 2 >nul 2>&1');
  } catch {}
}

console.log('\n================================================================');
console.log('✅ Spike Benchmark Completed!');
console.log('================================================================\n');
