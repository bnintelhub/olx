import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { monitorEventLoopDelay } from 'perf_hooks';
import { env } from '../config/env';

// Track event loop lag continuously with 20ms resolution
const eventLoopLagHistogram = monitorEventLoopDelay({ resolution: 20 });
eventLoopLagHistogram.enable();

declare module 'fastify' {
  interface FastifyRequest {
    startTime: bigint;
    timings?: Record<string, number>;
    trackTiming: (key: string, durationMs: number) => void;
  }
}

export function getEventLoopStats() {
  const toMs = (nanos: number) => Math.round((nanos / 1e6) * 100) / 100;
  return {
    minMs: toMs(eventLoopLagHistogram.min),
    p50Ms: toMs(eventLoopLagHistogram.percentile(50)),
    p90Ms: toMs(eventLoopLagHistogram.percentile(90)),
    p95Ms: toMs(eventLoopLagHistogram.percentile(95)),
    p99Ms: toMs(eventLoopLagHistogram.percentile(99)),
    maxMs: toMs(eventLoopLagHistogram.max),
    meanMs: toMs(eventLoopLagHistogram.mean),
  };
}

export const responseMetricsPlugin = fp(async (fastify: FastifyInstance) => {
  // 1. Record request start time using high-resolution monotonic timer
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.startTime = process.hrtime.bigint();
    request.timings = {};
    request.trackTiming = (key: string, durationMs: number) => {
      if (request.timings) {
        request.timings[key] = Math.round(durationMs * 100) / 100;
      }
    };
  });

  // 2. Add Server-Timing and standard response headers with ZERO JSON re-parsing overhead
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    const start = request.startTime;
    const durationMs = start
      ? Math.round(Number(process.hrtime.bigint() - start) / 10000) / 100
      : 0;

    let contentLength = 0;
    if (typeof payload === 'string') {
      contentLength = Buffer.byteLength(payload, 'utf8');
    } else if (Buffer.isBuffer(payload)) {
      contentLength = payload.length;
    } else if (reply.getHeader('content-length')) {
      contentLength = Number(reply.getHeader('content-length')) || 0;
    }

    reply.header('X-Response-Time-Ms', durationMs);
    reply.header('X-Content-Length-Bytes', contentLength);

    // Build standard W3C Server-Timing header (e.g., "total;dur=45.2, db;dur=12.1, redis;dur=1.4")
    const timingEntries: string[] = [`total;dur=${durationMs}`];
    if (request.timings) {
      for (const [key, dur] of Object.entries(request.timings)) {
        timingEntries.push(`${key};dur=${dur}`);
      }
    }
    reply.header('Server-Timing', timingEntries.join(', '));

    // Server-side diagnostic log for slow requests (> 2,000ms)
    if (durationMs > 2000) {
      fastify.log.warn(
        `⚠️ [SLOW REQUEST ${durationMs}ms] ${request.method} ${request.url} | ${timingEntries.join(', ')}`
      );
    }

    return payload;
  });

  // 3. Real-Time Single-Instance Diagnostic Endpoint
  fastify.get('/api/v1/diagnostics', async () => {
    const mem = process.memoryUsage();
    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          heapUsedMB: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
          heapTotalMB: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
          rssMB: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
          externalMB: Math.round((mem.external / (1024 * 1024)) * 100) / 100,
        },
        eventLoopLag: getEventLoopStats(),
        activeHandles: (process as any)._getActiveHandles ? (process as any)._getActiveHandles().length : 0,
        activeRequests: (process as any)._getActiveRequests ? (process as any)._getActiveRequests().length : 0,
        cpuUsage: process.cpuUsage(),
      },
    };
  });
});
