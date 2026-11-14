/**
 * Single Source of Truth for Media URLs
 * ---------------------------------------------------------------------------
 * Database: stores relative filepath (e.g. "ads/drafts/images/med_123/image.webp")
 * Backend API: outputs "${domain}/media/${filepath}" (or "/media/${filepath}")
 * 
 * Works identically on localhost, 127.0.0.1, Docker, Codespaces, and custom domains.
 * Completely eliminates duplicate protocols (never "https://https://").
 */

/**
 * Checks if a URL points to a 3rd-party external service (e.g. Unsplash)
 */
export function isExternalUrl(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  const sanitized = trimmed.replace(/^(?:https?:\/*)+/i, 'https://');
  if (/^https?:\/\//i.test(sanitized)) {
    // If it points to local development hosts or our own app domains, it's NOT external
    if (
      /localhost|127\.0\.0\.1|0\.0\.0\.0|server|backend|admin|client|\.app\.github\.dev|\.github\.dev/i.test(
        sanitized
      )
    ) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Clean storage key extractor (Single Source of Truth for DB Storage):
 * Strips all protocols, domains, and /media/ prefixes to return ONLY the pure relative filepath.
 * e.g. "https://https://domain.com/media/ads/123/image.webp" -> "ads/123/image.webp"
 * e.g. "https://domain.com/media/ads/123/image.webp" -> "ads/123/image.webp"
 * e.g. "/media/ads/123/image.webp" -> "ads/123/image.webp"
 * e.g. "ads/123/image.webp" -> "ads/123/image.webp"
 */
export function cleanStorageKey(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();

  // Preserve 3rd party external URLs (e.g. Unsplash)
  if (isExternalUrl(trimmed)) {
    return trimmed.replace(/^(?:https?:\/*)+/i, 'https://');
  }

  let clean = trimmed;
  const hasProtocol = /^(?:https?:\/*)+/i.test(clean);

  // 1. Remove duplicate or malformed protocols (e.g. "https://https://", "http://", "https:/")
  clean = clean.replace(/^(?:https?:\/*)+/i, '');

  // 2. If it had a protocol, or starts with a host:port or domain with dot, strip the host
  if (
    hasProtocol ||
    /^(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\//i.test(clean) ||
    /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d+)?\//i.test(clean)
  ) {
    clean = clean.replace(/^[^\/]+\//, '');
  }

  // 3. Repeatedly strip leading slashes and any /media/ or /uploads/ prefixes
  clean = clean.replace(/^[/\\]+/, '');
  while (/^(?:media|uploads)[/\\]/i.test(clean)) {
    clean = clean.replace(/^(?:media|uploads)[/\\]/i, '').replace(/^[/\\]+/, '');
  }

  // 4. Deduplicate any repeated /image.webp suffixes
  clean = clean.replace(/(\/image\.webp)+$/i, '/image.webp');

  return clean.trim();
}

/**
 * Backward-compatible alias
 */
export const normalizeMediaKey = cleanStorageKey;

/**
 * Normalizes all variant values inside an object to pure relative storage paths for DB
 */
export function normalizeMediaVariants(variants: any): Record<string, string> {
  if (!variants || typeof variants !== 'object') return {};
  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(variants)) {
    if (typeof val === 'string') {
      normalized[key] = cleanStorageKey(val);
    }
  }
  return normalized;
}

/**
 * Builds the final public URL returned by backend API: [domain] + /media/ + [filepath]
 * Ensures no duplicate protocol (never "https://https://") and handles any environment
 */
export function toPublicMediaUrl(pathOrUrl?: string | null, baseUrl?: string): string {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  const trimmed = pathOrUrl.trim();

  // If already a 3rd party external URL (e.g. Unsplash), clean duplicate protocol and return
  if (isExternalUrl(trimmed)) {
    return trimmed.replace(/^(?:https?:\/*)+/i, 'https://');
  }

  // Extract clean relative filepath (e.g. "ads/drafts/images/med_123/image.webp")
  const filepath = cleanStorageKey(trimmed);
  if (!filepath) return '';

  // Determine base domain
  let rawBase = (
    baseUrl ||
    process.env.MEDIA_PUBLIC_BASE_URL ||
    ''
  ).trim();

  // Avoid leaking Docker internal service hostnames like http://server:5000 or http://backend:5000
  if (rawBase.includes('server:') || rawBase.includes('backend:')) {
    rawBase = '';
  }

  // If no base domain provided, return relative /media path
  if (!rawBase) {
    return `/media/${filepath}`;
  }

  // Sanitize base domain: extract protocol and clean host
  const isHttps = /^https:\/\//i.test(rawBase) || rawBase.includes('.app.github.dev');
  const cleanHost = rawBase
    .replace(/^(?:https?:\/*)+/i, '')
    .replace(/[/\\]+(?:media|uploads)?$/i, '')
    .replace(/[/\\]+$/, '');

  if (!cleanHost) {
    return `/media/${filepath}`;
  }

  const protocol = isHttps ? 'https' : 'http';
  return `${protocol}://${cleanHost}/media/${filepath}`;
}

/**
 * Resolves all variants in an object to public URLs for API responses
 */
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
