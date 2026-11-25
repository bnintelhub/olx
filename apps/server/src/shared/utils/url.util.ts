import { FastifyRequest } from 'fastify';
import { env } from '../../config/env';

// Dynamically resolves the base URL of the Admin portal without hardcoded localhost fallbacks.
// Prioritizes environment configurations, then dynamically reconstructs from incoming request headers.
export function getAdminBaseUrl(request?: FastifyRequest): string {
  // 1. Explicit environment configuration
  if (env.ADMIN_URL && env.ADMIN_URL.trim()) {
    const raw = env.ADMIN_URL.trim().replace(/\/$/, '');
    return raw.endsWith('/admin') ? raw : `${raw}/admin`;
  }

  // 2. Dynamic reconstruction from request headers (proxies, Nginx, Docker)
  if (request) {
    const protoHeader = request.headers['x-forwarded-proto'];
    const protocol = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) || request.protocol || 'http';
    const hostHeader = request.headers['x-forwarded-host'] || request.headers.host;
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

    if (host) {
      return `${protocol}://${host}/admin`;
    }
  }

  // 3. Fallback to client/app URL from environment
  if (env.CLIENT_URL && env.CLIENT_URL.trim()) {
    const raw = env.CLIENT_URL.trim().replace(/\/$/, '');
    return `${raw}/admin`;
  }

  return '/admin';
}
