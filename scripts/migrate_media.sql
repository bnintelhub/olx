DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MediaAssetStatus') THEN
    CREATE TYPE "MediaAssetStatus" AS ENUM ('TEMP', 'PROCESSING', 'READY', 'FAILED', 'DELETED', 'QUARANTINED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MediaEntityType') THEN
    CREATE TYPE "MediaEntityType" AS ENUM ('LISTING', 'USER', 'CATEGORY', 'BANNER', 'CHAT', 'SYSTEM');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" VARCHAR(36) PRIMARY KEY,
  "owner_id" VARCHAR(36) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "entity_type" "MediaEntityType" DEFAULT 'LISTING',
  "entity_id" VARCHAR(36),
  "storage_provider" VARCHAR(20) DEFAULT 'LOCAL',
  "storage_key" VARCHAR(500) UNIQUE NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "extension" VARCHAR(20) NOT NULL,
  "size_bytes" BIGINT DEFAULT 0,
  "width" INT,
  "height" INT,
  "duration" DOUBLE PRECISION,
  "checksum" VARCHAR(64),
  "status" "MediaAssetStatus" DEFAULT 'TEMP',
  "variants" JSONB,
  "metadata" JSONB,
  "processing_started_at" TIMESTAMP(3),
  "processed_at" TIMESTAMP(3),
  "retry_count" INT DEFAULT 0,
  "failure_code" VARCHAR(50),
  "failure_reason" VARCHAR(255),
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3)
);

INSERT INTO "media_assets" (
  "id", "owner_id", "entity_type", "entity_id", "storage_provider", "storage_key",
  "original_name", "mime_type", "extension", "size_bytes", "width", "height",
  "status", "variants", "created_at", "updated_at"
)
SELECT 
  id,
  user_id,
  CASE scope::text
    WHEN 'CATEGORY' THEN 'CATEGORY'::"MediaEntityType"
    WHEN 'BANNER' THEN 'BANNER'::"MediaEntityType"
    WHEN 'CHAT' THEN 'CHAT'::"MediaEntityType"
    WHEN 'USER' THEN 'USER'::"MediaEntityType"
    ELSE 'LISTING'::"MediaEntityType"
  END,
  attached_to_id,
  'LOCAL',
  disk_path,
  original_name,
  mime_type,
  COALESCE(SUBSTRING(original_name FROM '\.([^\.]+)$'), 'webp'),
  file_size,
  width,
  height,
  CASE status::text
    WHEN 'PROCESSED' THEN 'READY'::"MediaAssetStatus"
    WHEN 'PROCESSING' THEN 'PROCESSING'::"MediaAssetStatus"
    WHEN 'FAILED' THEN 'FAILED'::"MediaAssetStatus"
    ELSE 'READY'::"MediaAssetStatus"
  END,
  variants,
  created_at,
  updated_at
FROM "media"
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "ad_images" ADD COLUMN IF NOT EXISTS "media_asset_id" VARCHAR(36);
UPDATE "ad_images" SET "media_asset_id" = "media_id" WHERE "media_asset_id" IS NULL AND "media_id" IS NOT NULL;

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "image_media_asset_id" VARCHAR(36);
UPDATE "categories" SET "image_media_asset_id" = "image_media_id" WHERE "image_media_asset_id" IS NULL AND "image_media_id" IS NOT NULL;

