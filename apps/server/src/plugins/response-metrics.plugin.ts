import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config/env';

export interface ResponseStats {
  totalRequests: number;
  averageResponseSize: string;
  averageResponseSizeBytes: number;
  p95ResponseSize: string;
  p95ResponseSizeBytes: number;
  largestResponse: {
    url: string;
    method: string;
    sizeBytes: number;
    sizeFormatted: string;
    timestamp: string;
  } | null;
}

interface InternalMetrics {
  count: number;
  totalBytes: number;
  recentSizes: number[];
  largestResponse: ResponseStats['largestResponse'];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = (bytes / Math.pow(1024, i)).toFixed(2);
  return `${val} ${units[i] || 'B'}`;
}

function calculateP95(sizes: number[]): number {
  if (sizes.length === 0) return 0;
  const sorted = [...sizes].sort((a, b) => a - b);
  const index = Math.min(Math.floor(0.95 * sorted.length), sorted.length - 1);
  return sorted[index];
}

const metrics: InternalMetrics = {
  count: 0,
  totalBytes: 0,
  recentSizes: [],
  largestResponse: null,
};

export function getResponseMetrics(): ResponseStats {
  const avg = metrics.count > 0 ? Math.round(metrics.totalBytes / metrics.count) : 0;
  const p95 = calculateP95(metrics.recentSizes);

  return {
    totalRequests: metrics.count,
    averageResponseSize: formatBytes(avg),
    averageResponseSizeBytes: avg,
    p95ResponseSize: formatBytes(p95),
    p95ResponseSizeBytes: p95,
    largestResponse: metrics.largestResponse,
  };
}

export const responseMetricsPlugin = fp(async (fastify: FastifyInstance) => {
  // Record request start time using high-resolution timer
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    (request as any).startTime = process.hrtime.bigint();
  });

  // Calculate duration and response size on send
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    const start = (request as any).startTime;
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

    // Set standard response headers
    reply.header('X-Response-Time-Ms', durationMs);
    reply.header('X-Content-Length-Bytes', contentLength);

    // Development mode enhancements
    if (env.NODE_ENV === 'development') {
      // Update memory sliding window for size percentiles (up to 1,000 samples)
      metrics.count++;
      metrics.totalBytes += contentLength;
      metrics.recentSizes.push(contentLength);
      if (metrics.recentSizes.length > 1000) {
        metrics.recentSizes.shift();
      }

      // Track largest response observed
      if (!metrics.largestResponse || contentLength > metrics.largestResponse.sizeBytes) {
        metrics.largestResponse = {
          url: request.raw.url || request.url,
          method: request.method,
          sizeBytes: contentLength,
          sizeFormatted: formatBytes(contentLength),
          timestamp: new Date().toISOString(),
        };
      }

      // Inject durationMs & contentLength directly into JSON responses
      if (typeof payload === 'string' && payload.startsWith('{')) {
        try {
          const parsed = JSON.parse(payload);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            parsed.durationMs = durationMs;
            parsed.contentLength = contentLength;
            const modified = JSON.stringify(parsed);
            contentLength = Buffer.byteLength(modified, 'utf8');
            reply.header('content-length', contentLength);
            reply.header('X-Content-Length-Bytes', contentLength);
            return modified;
          }
        } catch {
          // Keep original payload if not JSON
        }
      }
    }

    return payload;
  });

  // In development: Log response stats & expose metrics endpoint
  if (env.NODE_ENV === 'development') {
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip noisy health probes from logging
      if (request.url.startsWith('/health') || request.url.startsWith('/favicon')) return;

      const stats = getResponseMetrics();
      const currentSize = Number(reply.getHeader('X-Content-Length-Bytes')) || 0;
      const durationMs = reply.getHeader('X-Response-Time-Ms') || 0;

      fastify.log.info(
        `[DEV Response] ${request.method} ${request.url} -> ${reply.statusCode} | Duration: ${durationMs}ms | Size: ${formatBytes(currentSize)} | Avg: ${stats.averageResponseSize} | p95: ${stats.p95ResponseSize} | Largest: ${stats.largestResponse?.sizeFormatted || '0 B'}`
      );
    });

    fastify.get('/api/v1/dev/response-stats', async () => {
      return {
        success: true,
        data: getResponseMetrics(),
      };
    });
  }
});
