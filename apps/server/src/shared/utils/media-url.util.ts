/**
 * Media URL Normalization & Resolution Utilities
 * ---------------------------------------------------------------------------
 * Ensures database stores host/port-agnostic relative storage keys, while
 * API responses dynamically expand them into fully-qualified public URLs.
 */

export function normalizeMediaKey(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return '';
  let clean = val
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^s3:\/\/[^/]+/, '')
    .replace(/^[/\\]+/, '')
    .trim();

  // Repeatedly strip any leading media, olx-media, or uploads prefixes to prevent duplicate segments like /media/media/
  while (/^(?:media|olx-media|uploads)[/\\]/i.test(clean)) {
    clean = clean.replace(/^(?:media|olx-media|uploads)[/\\]/i, '').replace(/^[/\\]+/, '');
  }

  return clean.trim();
}

export function normalizeMediaVariants(variants: any): Record<string, string> {
  if (!variants || typeof variants !== 'object') return {};
  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(variants)) {
    if (typeof val === 'string') {
      normalized[key] = normalizeMediaKey(val);
    }
  }
  return normalized;
}

export function toPublicMediaUrl(pathOrUrl: string | null | undefined, baseUrl?: string): string {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  const cleanKey = normalizeMediaKey(pathOrUrl);
  if (!cleanKey) return '';
  // Avoid leaking Docker internal service hostnames like http://server:5000 or http://backend:5000 to public clients
  const isInternalHost = baseUrl && (baseUrl.includes('server:') || baseUrl.includes('backend:'));
  const base = (
    (!isInternalHost && baseUrl) ||
    process.env.MEDIA_PUBLIC_BASE_URL ||
    process.env.MEDIA_CDN_URL ||
    'http://localhost:5000/media'
  ).replace(/\/+$/, '');
  const prefix = base.endsWith('/media') || base.endsWith('/uploads') ? base : `${base}/media`;
  return `${prefix}/${cleanKey}`;
}

export function toPublicMediaVariants(variants: any, baseUrl?: string): Record<string, string> {
  if (!variants || typeof variants !== 'object') return {};
  const resolved: Record<string, string> = {};
  for (const [key, val] of Object.entries(variants)) {
    if (typeof val === 'string') {
      resolved[key] = toPublicMediaUrl(val, baseUrl);
    }
  }
  return resolved;
}

