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

/**
 * Normalizes any storage or full HTTP URL into a pure relative media key
 * e.g. "http://localhost:9000/olx-media/ads/drafts/images/med_123/card.webp" -> "ads/drafts/images/med_123/card.webp"
 * e.g. "http://localhost:3900/olx-media/ads/drafts/images/med_123/card.webp" -> "ads/drafts/images/med_123/card.webp"
 * e.g. "http://localhost:5000/uploads/ads/drafts/images/med_123/card.webp" -> "ads/drafts/images/med_123/card.webp"
 * e.g. "s3://olx-media/ads/drafts/images/med_123/card.webp" -> "ads/drafts/images/med_123/card.webp"
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

/**
 * Normalizes all keys inside a variants object to ensure only relative paths are stored in DB
 */
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

/**
 * Dynamically resolves a relative media key to a fully qualified public URL
 */
export function toPublicMediaUrl(pathOrUrl: string | null | undefined, baseUrl?: string): string {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  const cleanKey = normalizeMediaKey(pathOrUrl);
  if (!cleanKey) return '';
  const base = (
    baseUrl ||
    process.env.MEDIA_PUBLIC_BASE_URL ||
    process.env.MEDIA_CDN_URL ||
    'http://localhost:5000/media'
  ).replace(/\/+$/, '');
  const prefix = base.endsWith('/media') || base.endsWith('/uploads') ? base : `${base}/media`;
  return `${prefix}/${cleanKey}`;
}

/**
 * Resolves a variants object from relative keys to public URLs for API responses
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


