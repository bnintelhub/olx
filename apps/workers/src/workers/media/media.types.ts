import { MediaResource } from '@olx/shared';

// Legacy job payload (for Media table)
export interface MediaProcessJobData {
  mediaId: string;
  tempPath: string;
  userId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  baseUrl?: string;
  resource?: MediaResource;
  resourceId?: string;
  mediaType?: string;
}

// New MediaAsset job payload (for media_assets table)
export interface MediaProcessingJobData {
  assetId: string;
  ownerId: string;
  tempStorageKey: string;
  originalName: string;
  mimeType: string;
  extension: string;
  checksum: string;
  sizeBytes: number;
  entityType?: string;
  entityId?: string;
}
