/**
 * Media URL Normalization & Resolution Utilities
 * ---------------------------------------------------------------------------
 * Ensures database stores host/port-agnostic relative storage keys, while
 * API responses dynamically expand them into fully-qualified public URLs.
 */

export function isExternalUrl(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    // If it points to local development hosts or container services, it's NOT an external URL
    if (/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|server|backend|admin|client)(?::\d+)?(?:[/?#]|$)/i.test(trimmed)) {
      return false;
    }
    return true;
  }
  return false;
}

export function normalizeMediaKey(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  // Preserve external CDN / Unsplash / S3 URLs as-is
  if (isExternalUrl(trimmed)) {
    return trimmed;
  }

  let clean = trimmed
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^s3:\/\/[^/]+/, '')
    .replace(/^[/\\]+/, '')
    .trim();

  // Repeatedly strip any leading media, olx-media, or uploads prefixes to prevent duplicate segments like /media/media/
  while (/^(?:media|olx-media|uploads)[/\\]/i.test(clean)) {
    clean = clean.replace(/^(?:media|olx-media|uploads)[/\\]/i, '').replace(/^[/\\]+/, '');
  }

  // Deduplicate any repeated /image.webp suffixes
  clean = clean.replace(/(\/image\.webp)+$/i, '/image.webp');

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
  const trimmed = pathOrUrl.trim();
  if (isExternalUrl(trimmed)) {
    return trimmed;
  }

  const cleanKey = normalizeMediaKey(trimmed);
  if (!cleanKey) return '';

  // Avoid leaking Docker internal service hostnames like http://server:5000 or http://backend:5000 to public clients
  const isInternalHost = baseUrl && (baseUrl.includes('server:') || baseUrl.includes('backend:'));
  const base = (
    (!isInternalHost && baseUrl) ||
    process.env.MEDIA_PUBLIC_BASE_URL ||
    process.env.MEDIA_CDN_URL ||
    '/media'
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


