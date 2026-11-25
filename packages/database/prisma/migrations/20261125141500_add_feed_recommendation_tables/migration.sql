-- CreateEnum
CREATE TYPE "InteractionEventType" AS ENUM ('IMPRESSION', 'CLICK', 'VIEW', 'SEARCH', 'CATEGORY_BROWSE', 'WISHLIST', 'CHAT');

-- CreateTable
CREATE TABLE "user_interactions" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36),
    "session_id" VARCHAR(100),
    "listing_id" VARCHAR(36),
    "category_id" VARCHAR(36),
    "event_type" "InteractionEventType" NOT NULL,
    "event_id" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interests" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "category_id" VARCHAR(36) NOT NULL,
    "interest_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_price_min" DECIMAL(12,2),
    "avg_price_max" DECIMAL(12,2),
    "preferred_location_id" VARCHAR(36),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_impressions" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36),
    "session_id" VARCHAR(100),
    "listing_id" VARCHAR(36) NOT NULL,
    "feed_position" INTEGER NOT NULL,
    "feed_version" VARCHAR(20) NOT NULL DEFAULT 'v1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_candidates" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "listing_id" VARCHAR(36) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" VARCHAR(100),
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_interactions_event_id_key" ON "user_interactions"("event_id");
CREATE INDEX "user_interactions_user_id_created_at_idx" ON "user_interactions"("user_id", "created_at");
CREATE INDEX "user_interactions_session_id_created_at_idx" ON "user_interactions"("session_id", "created_at");
CREATE INDEX "user_interactions_listing_id_event_type_created_at_idx" ON "user_interactions"("listing_id", "event_type", "created_at");
CREATE INDEX "user_interactions_created_at_idx" ON "user_interactions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_interests_user_id_category_id_key" ON "user_interests"("user_id", "category_id");
CREATE INDEX "user_interests_user_id_interest_score_idx" ON "user_interests"("user_id", "interest_score");

-- CreateIndex
CREATE INDEX "feed_impressions_user_id_created_at_idx" ON "feed_impressions"("user_id", "created_at");
CREATE INDEX "feed_impressions_session_id_created_at_idx" ON "feed_impressions"("session_id", "created_at");
CREATE INDEX "feed_impressions_listing_id_created_at_idx" ON "feed_impressions"("listing_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_candidates_user_id_listing_id_key" ON "recommendation_candidates"("user_id", "listing_id");
CREATE INDEX "recommendation_candidates_user_id_score_idx" ON "recommendation_candidates"("user_id", "score");
CREATE INDEX "recommendation_candidates_expires_at_idx" ON "recommendation_candidates"("expires_at");

-- AddForeignKey
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_impressions" ADD CONSTRAINT "feed_impressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feed_impressions" ADD CONSTRAINT "feed_impressions_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_candidates" ADD CONSTRAINT "recommendation_candidates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_candidates" ADD CONSTRAINT "recommendation_candidates_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
