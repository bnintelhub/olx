import crypto from 'crypto';

export type MediaResource =
  | 'users'
  | 'ads'
  | 'categories'
  | 'brands'
  | 'chats'
  | 'verification'
  | 'system';

export type MediaVariant =
  | 'original'
  | 'large'
  | 'medium'
  | 'thumbnail'
  | 'card'
  | string;

export interface MediaPathParams {
  resource: MediaResource;
  resourceId: string;
  mediaType: string;
  mediaId?: string;
  variant?: MediaVariant;
  format?: string;
}

// Determines if a resource logically has only a single active file
export function isSingleFileResource(resource: MediaResource, mediaType: string): boolean {
  if (resource === 'users' && (mediaType === 'avatar' || mediaType === 'cover')) {
    return true;
  }
  if (resource === 'categories' && (mediaType === 'icon' || mediaType === 'banner')) {
    return true;
  }
  if (resource === 'brands' && (mediaType === 'logo' || mediaType === 'banner')) {
    return true;
  }
  if (resource === 'system' && (mediaType === 'logo' || mediaType === 'favicon')) {
    return true;
  }
  return false;
}

// Sanitizes path segments to prevent directory traversal or malformed paths
function cleanSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9_-]/g, '').trim();
}

// Returns the parent directory path for a given media resource
export function buildMediaDirectory(params: {
  resource: MediaResource;
  resourceId: string;
  mediaType: string;
  mediaId?: string;
}): string {
  const resource = cleanSegment(params.resource);
  const resourceId = cleanSegment(params.resourceId);
  const mediaType = cleanSegment(params.mediaType);

  if (!resource || !resourceId || !mediaType) {
    throw new Error('Missing required media path parameters: resource, resourceId, and mediaType');
  }

  if (isSingleFileResource(params.resource, params.mediaType)) {
    return `${resource}/${resourceId}/${mediaType}`;
  }

  if (!params.mediaId) {
    throw new Error(`Multi-file resource ${resource}/${mediaType} requires a mediaId`);
  }

  const mediaId = cleanSegment(params.mediaId);
  return `${resource}/${resourceId}/${mediaType}/${mediaId}`;
}

// Generates a predictable, human-readable, domain-driven storage path
export function buildMediaPath(params: MediaPathParams): string {
  const resource = cleanSegment(params.resource);
  const resourceId = cleanSegment(params.resourceId);
  const mediaType = cleanSegment(params.mediaType);
  const format = (params.format || 'webp').replace(/^\.+/, '').toLowerCase();

  if (!resource || !resourceId || !mediaType) {
    throw new Error('Missing required media path parameters: resource, resourceId, and mediaType');
  }

  // Single-file resource (e.g. users/{userId}/avatar/thumbnail.webp or categories/{catId}/icon.webp)
  if (isSingleFileResource(params.resource, params.mediaType)) {
    if (params.variant) {
      const variant = cleanSegment(params.variant);
      return `${resource}/${resourceId}/${mediaType}/${variant}.${format}`;
    }
    return `${resource}/${resourceId}/${mediaType}.${format}`;
  }

  // Multi-file resource (e.g. ads/{adId}/images/{imageId}/large.webp)
  if (!params.mediaId) {
    throw new Error(`Multi-file resource ${resource}/${mediaType} requires a mediaId`);
  }

  const mediaId = cleanSegment(params.mediaId);
  const variant = cleanSegment(params.variant || 'large');
  return `${resource}/${resourceId}/${mediaType}/${mediaId}/${variant}.${format}`;
}

export function isExternalUrl(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  const sanitized = trimmed.replace(/^(?:https?:\/*)+/i, 'https://');
  if (/^https?:\/\//i.test(sanitized)) {
    // If it points to local development hosts or our own app domains, it is NOT an external 3rd-party URL
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
export function cleanStorageKey(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();

  // Preserve true 3rd party external URLs (e.g. Unsplash) but clean duplicate protocols
  if (isExternalUrl(trimmed)) {
    return trimmed.replace(/^(?:https?:\/*)+/i, 'https://');
  }

  let clean = trimmed;
  const hasProtocol = /^(?:https?:\/*)+/i.test(clean);

  // 1. Remove any duplicated or malformed protocol prefixes (e.g. "https://https://", "http://", "https:/")
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
 * Alias for cleanStorageKey for backward compatibility
 */
export const normalizeMediaKey = cleanStorageKey;

/**
 * Normalizes all variant values inside an object to pure relative storage paths for database storage
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
 * Builds a public URL: [domain] + /media/ + [filepath]
 * Ensures no duplicate protocol (never "https://https://") and handles any environment
 */
export function toPublicMediaUrl(pathOrUrl: string | null | undefined, baseUrl?: string): string {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  const trimmed = pathOrUrl.trim();

  // If already an external 3rd party URL (e.g. Unsplash), clean duplicate protocol and return
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
  const hasHttps = /^https:\/\//i.test(rawBase) || rawBase.includes('.app.github.dev');
  const cleanHost = rawBase
    .replace(/^(?:https?:\/*)+/i, '')
    .replace(/[/\\]+(?:media|uploads)?$/i, '')
    .replace(/[/\\]+$/, '');

  if (!cleanHost) {
    return `/media/${filepath}`;
  }

  const protocol = hasHttps ? 'https' : 'http';
  return `${protocol}://${cleanHost}/media/${filepath}`;
}

/**
 * Resolves all variants in an object to public URLs for API consumption
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

/**
 * Generates a ULID-compatible sortable identifier
 */
export function generateAssetId(): string {
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const random = crypto.randomBytes(10).toString('hex').toUpperCase().slice(0, 16);
  return `${timestamp}${random}`;
}

/**
 * Builds permanent storage directory path: {type}/YYYY/MM/DD/{assetId}
 */
export function buildAssetStorageDir(
  assetType: 'images' | 'videos' | 'documents',
  assetId: string,
  date = new Date()
): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${assetType}/${year}/${month}/${day}/${assetId}`;
}

/**
 * Builds permanent storage key: {type}/YYYY/MM/DD/{assetId}/{filename}
 */
export function buildAssetStorageKey(
  assetType: 'images' | 'videos' | 'documents',
  assetId: string,
  filename: string,
  date = new Date()
): string {
  const dir = buildAssetStorageDir(assetType, assetId, date);
  return `${dir}/${filename}`;
}



