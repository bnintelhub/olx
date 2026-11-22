-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'USER', 'SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'CUSTOMER_SUPPORT', 'FINANCE_ADMIN', 'CONTENT_MANAGER', 'ANALYST');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'REGISTER', 'PHONE_UPDATE', 'TRANSACTION_VERIFY', 'PASSWORD_RESET', 'EMAIL_VERIFICATION');

-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'DATE');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'EXPIRED', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BoostType" AS ENUM ('FEATURED', 'URGENT', 'HOME_SPOTLIGHT');

-- CreateEnum
CREATE TYPE "BoostStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM', 'LOCATION', 'SYSTEM_NOTICE');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CHAT_MESSAGE', 'AD_APPROVED', 'AD_REJECTED', 'AD_EXPIRING_SOON', 'PRICE_DROP', 'SAVED_SEARCH_MATCH', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM_OR_FRAUD', 'INAPPROPRIATE_CONTENT', 'PROHIBITED_ITEM', 'MISLEADING_PRICE', 'DUPLICATE_LISTING', 'ALREADY_SOLD', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('TEMP', 'PROCESSING', 'READY', 'FAILED', 'DELETED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "MediaEntityType" AS ENUM ('LISTING', 'USER', 'CATEGORY', 'BANNER', 'CHAT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('LISTING_BOOST', 'FEATURED_LISTING', 'TOP_LISTING', 'SELLER_SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUND_REQUESTED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(36) NOT NULL,
    "phone_number" VARCHAR(15),
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "email" VARCHAR(255),
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" VARCHAR(255),
    "google_id" VARCHAR(255),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "capabilities" TEXT[] DEFAULT ARRAY['can_buy', 'can_sell']::TEXT[],
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "refresh_token_hash" VARCHAR(255),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "avatar_url" VARCHAR(500),
    "bio" VARCHAR(500),
    "account_type" VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    "business_name" VARCHAR(150),
    "location_id" VARCHAR(36),
    "rating_average" DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "is_identity_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_sessions" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36),
    "phone_number" VARCHAR(15),
    "email" VARCHAR(255),
    "otp_hash" VARCHAR(255) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "normalized_name" VARCHAR(100) NOT NULL DEFAULT '',
    "slug" VARCHAR(120) NOT NULL,
    "parent_id" VARCHAR(36),
    "type" VARCHAR(20) NOT NULL,
    "path" VARCHAR(500) NOT NULL DEFAULT '/',
    "depth" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "pincode" VARCHAR(10),
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" VARCHAR(36) NOT NULL,
    "parent_id" VARCHAR(36),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "image_media_asset_id" VARCHAR(36),
    "icon_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attributes" (
    "id" VARCHAR(36) NOT NULL,
    "category_id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "display_label" VARCHAR(120),
    "type" "AttributeType" NOT NULL,
    "options" JSONB,
    "validation_rules" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_filterable" BOOLEAN NOT NULL DEFAULT true,
    "unit" VARCHAR(20),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "category_id" VARCHAR(36) NOT NULL,
    "location_id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "is_negotiable" BOOLEAN NOT NULL DEFAULT true,
    "status" "AdStatus" NOT NULL DEFAULT 'ACTIVE',
    "rejection_reason" VARCHAR(255),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "chat_count" INTEGER NOT NULL DEFAULT 0,
    "favourite_count" INTEGER NOT NULL DEFAULT 0,
    "attributes_cache" JSONB,
    "contact_preference" VARCHAR(30) NOT NULL DEFAULT 'CHAT_AND_CALL',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "renewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_images" (
    "id" VARCHAR(36) NOT NULL,
    "ad_id" VARCHAR(36) NOT NULL,
    "media_asset_id" VARCHAR(36) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" VARCHAR(36) NOT NULL,
    "owner_id" VARCHAR(36) NOT NULL,
    "entity_type" "MediaEntityType" NOT NULL DEFAULT 'LISTING',
    "entity_id" VARCHAR(36),
    "storage_provider" VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    "storage_key" VARCHAR(500) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "extension" VARCHAR(20) NOT NULL,
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DOUBLE PRECISION,
    "checksum" VARCHAR(64),
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'TEMP',
    "variants" JSONB,
    "metadata" JSONB,
    "processing_started_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "failure_code" VARCHAR(50),
    "failure_reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_attribute_values" (
    "id" VARCHAR(36) NOT NULL,
    "ad_id" VARCHAR(36) NOT NULL,
    "attribute_id" VARCHAR(36) NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" VARCHAR(36) NOT NULL,
    "ad_id" VARCHAR(36) NOT NULL,
    "buyer_id" VARCHAR(36) NOT NULL,
    "seller_id" VARCHAR(36) NOT NULL,
    "last_message_id" VARCHAR(36),
    "last_message_text" VARCHAR(1000),
    "last_message_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buyer_unread_count" INTEGER NOT NULL DEFAULT 0,
    "seller_unread_count" INTEGER NOT NULL DEFAULT 0,
    "buyer_pinned_at" TIMESTAMP(3),
    "seller_pinned_at" TIMESTAMP(3),
    "buyer_archived_at" TIMESTAMP(3),
    "seller_archived_at" TIMESTAMP(3),
    "buyer_deleted_at" TIMESTAMP(3),
    "seller_deleted_at" TIMESTAMP(3),
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" VARCHAR(36) NOT NULL,
    "conversation_id" VARCHAR(36) NOT NULL,
    "sender_id" VARCHAR(36) NOT NULL,
    "receiver_id" VARCHAR(36),
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "attachment_url" VARCHAR(500),
    "attachment_media_asset_id" VARCHAR(36),
    "reply_to_message_id" VARCHAR(36),
    "client_message_id" VARCHAR(64),
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_notes" (
    "id" VARCHAR(36) NOT NULL,
    "conversation_id" VARCHAR(36),
    "report_id" VARCHAR(36),
    "author_id" VARCHAR(36) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favourites" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "ad_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favourites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "query_criteria" JSONB NOT NULL,
    "notify_email" BOOLEAN NOT NULL DEFAULT false,
    "notify_push" BOOLEAN NOT NULL DEFAULT true,
    "last_notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" VARCHAR(36) NOT NULL,
    "author_id" VARCHAR(36) NOT NULL,
    "target_id" VARCHAR(36) NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" VARCHAR(36) NOT NULL,
    "reporter_id" VARCHAR(36) NOT NULL,
    "reported_id" VARCHAR(36),
    "ad_id" VARCHAR(36),
    "conversation_id" VARCHAR(36),
    "message_id" VARCHAR(36),
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "assigned_to_id" VARCHAR(36),
    "resolution_reason" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" VARCHAR(36) NOT NULL,
    "requester_id" VARCHAR(36) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to_id" VARCHAR(36),
    "sla_target_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_entries" (
    "id" VARCHAR(36) NOT NULL,
    "ticket_id" VARCHAR(36) NOT NULL,
    "author_id" VARCHAR(36),
    "body" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" VARCHAR(36) NOT NULL,
    "blocker_id" VARCHAR(36) NOT NULL,
    "blocked_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_ads" (
    "id" VARCHAR(36) NOT NULL,
    "ad_id" VARCHAR(36) NOT NULL,
    "type" "BoostType" NOT NULL DEFAULT 'FEATURED',
    "status" "BoostStatus" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "subtitle" VARCHAR(255),
    "cta_text" VARCHAR(100),
    "target_url" VARCHAR(500),
    "position" VARCHAR(50) NOT NULL DEFAULT 'HOME_HERO',
    "media_type" VARCHAR(20) NOT NULL DEFAULT 'IMAGE',
    "desktop_media_url" VARCHAR(500),
    "mobile_media_url" VARCHAR(500),
    "image_media_asset_id" VARCHAR(36),
    "city_id" VARCHAR(36),
    "category_id" VARCHAR(36),
    "location_text" VARCHAR(150),
    "category_text" VARCHAR(150),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36),
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(50) NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" VARCHAR(36),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "staff_invitations" (
    "id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "invited_by_id" VARCHAR(36) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "listing_id" VARCHAR(36),
    "purpose" "PaymentPurpose" NOT NULL DEFAULT 'OTHER',
    "product_id" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "metadata" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" VARCHAR(36) NOT NULL,
    "payment_order_id" VARCHAR(36) NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'PAYU',
    "merchant_transaction_id" VARCHAR(100) NOT NULL,
    "provider_transaction_id" VARCHAR(100),
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "payment_method" VARCHAR(50),
    "provider_response" JSONB,
    "paid_at" TIMESTAMP(3),
    "refunded_amount" DECIMAL(12,2),
    "refund_reason" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_phone_number_idx" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "otp_sessions_phone_number_is_used_expires_at_idx" ON "otp_sessions"("phone_number", "is_used", "expires_at");

-- CreateIndex
CREATE INDEX "otp_sessions_email_is_used_expires_at_idx" ON "otp_sessions"("email", "is_used", "expires_at");

-- CreateIndex
CREATE INDEX "locations_parent_id_idx" ON "locations"("parent_id");

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "locations"("type");

-- CreateIndex
CREATE INDEX "locations_is_active_idx" ON "locations"("is_active");

-- CreateIndex
CREATE INDEX "locations_slug_idx" ON "locations"("slug");

-- CreateIndex
CREATE INDEX "locations_path_idx" ON "locations"("path");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "locations_parent_id_type_idx" ON "locations"("parent_id", "type");

-- CreateIndex
CREATE INDEX "locations_parent_id_normalized_name_idx" ON "locations"("parent_id", "normalized_name");

-- CreateIndex
CREATE INDEX "locations_parent_id_type_normalized_name_idx" ON "locations"("parent_id", "type", "normalized_name");

-- CreateIndex
CREATE INDEX "locations_type_is_active_idx" ON "locations"("type", "is_active");

-- CreateIndex
CREATE INDEX "categories_parent_id_sort_order_idx" ON "categories"("parent_id", "sort_order");

-- CreateIndex
CREATE INDEX "categories_parent_id_is_active_idx" ON "categories"("parent_id", "is_active");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_image_media_asset_id_idx" ON "categories"("image_media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_parent_id_slug_key" ON "categories"("parent_id", "slug");

-- CreateIndex
CREATE INDEX "category_attributes_category_id_is_filterable_idx" ON "category_attributes"("category_id", "is_filterable");

-- CreateIndex
CREATE UNIQUE INDEX "category_attributes_category_id_key_key" ON "category_attributes"("category_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ads_slug_key" ON "ads"("slug");

-- CreateIndex
CREATE INDEX "ads_status_category_id_created_at_idx" ON "ads"("status", "category_id", "created_at");

-- CreateIndex
CREATE INDEX "ads_status_location_id_created_at_idx" ON "ads"("status", "location_id", "created_at");

-- CreateIndex
CREATE INDEX "ads_status_expires_at_created_at_idx" ON "ads"("status", "expires_at", "created_at");

-- CreateIndex
CREATE INDEX "ads_status_created_at_idx" ON "ads"("status", "created_at");

-- CreateIndex
CREATE INDEX "ads_location_id_idx" ON "ads"("location_id");

-- CreateIndex
CREATE INDEX "ads_category_id_location_id_idx" ON "ads"("category_id", "location_id");

-- CreateIndex
CREATE INDEX "ads_status_price_idx" ON "ads"("status", "price");

-- CreateIndex
CREATE INDEX "ads_user_id_status_idx" ON "ads"("user_id", "status");

-- CreateIndex
CREATE INDEX "ads_latitude_longitude_idx" ON "ads"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "ad_images_ad_id_sort_order_idx" ON "ad_images"("ad_id", "sort_order");

-- CreateIndex
CREATE INDEX "ad_images_media_asset_id_idx" ON "ad_images"("media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_images_ad_id_media_asset_id_key" ON "ad_images"("ad_id", "media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "media_assets_owner_id_status_idx" ON "media_assets"("owner_id", "status");

-- CreateIndex
CREATE INDEX "media_assets_entity_type_entity_id_idx" ON "media_assets"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "media_assets_status_created_at_idx" ON "media_assets"("status", "created_at");

-- CreateIndex
CREATE INDEX "media_assets_checksum_idx" ON "media_assets"("checksum");

-- CreateIndex
CREATE INDEX "ad_attribute_values_attribute_id_idx" ON "ad_attribute_values"("attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_attribute_values_ad_id_attribute_id_key" ON "ad_attribute_values"("ad_id", "attribute_id");

-- CreateIndex
CREATE INDEX "conversations_buyer_id_last_message_at_idx" ON "conversations"("buyer_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversations_seller_id_last_message_at_idx" ON "conversations"("seller_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversations_buyer_id_buyer_pinned_at_last_activity_at_idx" ON "conversations"("buyer_id", "buyer_pinned_at", "last_activity_at");

-- CreateIndex
CREATE INDEX "conversations_seller_id_seller_pinned_at_last_activity_at_idx" ON "conversations"("seller_id", "seller_pinned_at", "last_activity_at");

-- CreateIndex
CREATE INDEX "conversations_status_updated_at_idx" ON "conversations"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_ad_id_buyer_id_seller_id_key" ON "conversations"("ad_id", "buyer_id", "seller_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "messages_receiver_id_idx" ON "messages"("receiver_id");

-- CreateIndex
CREATE INDEX "messages_client_message_id_idx" ON "messages"("client_message_id");

-- CreateIndex
CREATE INDEX "messages_attachment_media_asset_id_idx" ON "messages"("attachment_media_asset_id");

-- CreateIndex
CREATE INDEX "moderation_notes_conversation_id_idx" ON "moderation_notes"("conversation_id");

-- CreateIndex
CREATE INDEX "moderation_notes_report_id_idx" ON "moderation_notes"("report_id");

-- CreateIndex
CREATE INDEX "moderation_notes_author_id_idx" ON "moderation_notes"("author_id");

-- CreateIndex
CREATE INDEX "favourites_user_id_created_at_idx" ON "favourites"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "favourites_user_id_ad_id_key" ON "favourites"("user_id", "ad_id");

-- CreateIndex
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");

-- CreateIndex
CREATE INDEX "reviews_target_id_rating_idx" ON "reviews"("target_id", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_author_id_target_id_key" ON "reviews"("author_id", "target_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "reports_assigned_to_id_status_idx" ON "reports"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "reports_conversation_id_idx" ON "reports"("conversation_id");

-- CreateIndex
CREATE INDEX "reports_message_id_idx" ON "reports"("message_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_priority_created_at_idx" ON "support_tickets"("status", "priority", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_assigned_to_id_status_idx" ON "support_tickets"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "support_ticket_entries_ticket_id_created_at_idx" ON "support_ticket_entries"("ticket_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blocker_id_blocked_id_key" ON "blocks"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "featured_ads_ad_id_status_ends_at_idx" ON "featured_ads"("ad_id", "status", "ends_at");

-- CreateIndex
CREATE INDEX "banners_is_active_status_position_priority_idx" ON "banners"("is_active", "status", "position", "priority");

-- CreateIndex
CREATE INDEX "banners_starts_at_ends_at_idx" ON "banners"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "banners_image_media_asset_id_idx" ON "banners"("image_media_asset_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitations_token_key" ON "staff_invitations"("token");

-- CreateIndex
CREATE INDEX "staff_invitations_email_idx" ON "staff_invitations"("email");

-- CreateIndex
CREATE INDEX "staff_invitations_token_idx" ON "staff_invitations"("token");

-- CreateIndex
CREATE INDEX "staff_invitations_status_idx" ON "staff_invitations"("status");

-- CreateIndex
CREATE INDEX "payment_orders_user_id_status_idx" ON "payment_orders"("user_id", "status");

-- CreateIndex
CREATE INDEX "payment_orders_listing_id_status_idx" ON "payment_orders"("listing_id", "status");

-- CreateIndex
CREATE INDEX "payment_orders_status_created_at_idx" ON "payment_orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "payment_transactions_payment_order_id_status_idx" ON "payment_transactions"("payment_order_id", "status");

-- CreateIndex
CREATE INDEX "payment_transactions_merchant_transaction_id_idx" ON "payment_transactions"("merchant_transaction_id");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_transaction_id_idx" ON "payment_transactions"("provider_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_merchant_transaction_id_key" ON "payment_transactions"("provider", "merchant_transaction_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_sessions" ADD CONSTRAINT "otp_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_image_media_asset_id_fkey" FOREIGN KEY ("image_media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_images" ADD CONSTRAINT "ad_images_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_images" ADD CONSTRAINT "ad_images_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_attribute_values" ADD CONSTRAINT "ad_attribute_values_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_attribute_values" ADD CONSTRAINT "ad_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "category_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_message_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_attachment_media_asset_id_fkey" FOREIGN KEY ("attachment_media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_notes" ADD CONSTRAINT "moderation_notes_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_notes" ADD CONSTRAINT "moderation_notes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_notes" ADD CONSTRAINT "moderation_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_id_fkey" FOREIGN KEY ("reported_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_entries" ADD CONSTRAINT "support_ticket_entries_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_entries" ADD CONSTRAINT "support_ticket_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_ads" ADD CONSTRAINT "featured_ads_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_image_media_asset_id_fkey" FOREIGN KEY ("image_media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "ads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

