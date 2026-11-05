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

