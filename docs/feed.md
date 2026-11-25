# BLX Orbit — Feed, Search & Recommendation Architecture

This document describes the production **Home Feed**, **Hybrid Recommendation System (Phase 1)**, **Dynamic Search**, and **Cursor-based Pagination** across `apps/server`, `apps/workers`, `packages/database`, and `apps/client`.

---

## 1. System Components & Key Files

### Database (`packages/database`)
- [`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma) — Defines `InteractionEventType` and 4 recommendation tables alongside existing `Ad`, `FeaturedAd`, `Block`, `Category`, and `Location` models:
  - `user_interactions` (`event_id` unique key for idempotency, `(user_id, created_at)`, `(session_id, created_at)`, `(listing_id, event_type, created_at)`)
  - `user_interests` (unique `(user_id, category_id)`, `interest_score`, `avg_price_min`, `avg_price_max`, `preferred_location_id`)
  - `feed_impressions` (`user_id`, `session_id`, `listing_id`, `feed_position`, `feed_version`, `created_at`)
  - `recommendation_candidates` (unique `(user_id, listing_id)`, `score`, `reason`, `expires_at`)
- Migrations:
  - [`20261125123000_add_pg_trgm_search_indexes`](../packages/database/prisma/migrations/20261125123000_add_pg_trgm_search_indexes/migration.sql) — Enables `pg_trgm` and GIN indexes on `ads`, `ad_attribute_values`, `categories`, `locations`, and `profiles`.
  - [`20261125141500_add_feed_recommendation_tables`](../packages/database/prisma/migrations/20261125141500_add_feed_recommendation_tables/migration.sql) — Creates the 4 Phase 1 recommendation tables, foreign keys, and indexes.

### Backend (`apps/server`)
- **Feed & Ranking Engine (`src/modules/feed/`)**:
  - [`feed.config.ts`](../apps/server/src/modules/feed/feed.config.ts) — Configurable ranking weights (`DEFAULT_RANKING_WEIGHTS` / `FEED_WEIGHTS_JSON`), limits (`FEED_LIMITS`), jittered TTLs (`getJitteredFeedTtl`), and deterministic cohort rollout (`isPersonalizationEnabledFor`).
  - [`feed-ranking.service.ts`](../apps/server/src/modules/feed/feed-ranking.service.ts) — Normalizes 6 signals to `[0, 1]` (`scoreListing`) and applies seller repetition caps + separated `FeaturedAd` promoted slots (`diversifyFeed`).
  - [`feed.service.ts`](../apps/server/src/modules/feed/feed.service.ts) — `FeedService.getHomeFeed`, `FeedService.getTrendingFeed`, and `FeedService.getSimilarFeed` with Redis single-flight locking, graceful PostgreSQL fallback, and opaque cursor pagination.
  - [`feed.controller.ts`](../apps/server/src/modules/feed/feed.controller.ts) & [`feed.routes.ts`](../apps/server/src/modules/feed/feed.routes.ts) — Exposes `/api/v1/feed/*` with `optionalAuthenticate` and rate limiting.
- **Event Ingestion (`src/modules/feed-events/` & `src/jobs/feed.job.ts`)**:
  - [`feed-events.schema.ts`](../apps/server/src/modules/feed-events/feed-events.schema.ts), [`feed-events.service.ts`](../apps/server/src/modules/feed-events/feed-events.service.ts), [`feed-events.controller.ts`](../apps/server/src/modules/feed-events/feed-events.controller.ts), [`feed-events.routes.ts`](../apps/server/src/modules/feed-events/feed-events.routes.ts) — `POST /api/v1/events` validates up to 25 events per request, derives `userId` strictly from auth context, deduplicates via Redis NX + `eventId`, enqueues to BullMQ `feed-events`, and returns `202 Accepted`.
- **Auth & Config**:
  - [`auth.plugin.ts`](../apps/server/src/plugins/auth.plugin.ts) — Adds `fastify.optionalAuthenticate` for endpoints supporting both authenticated and anonymous users.
  - [`env.ts`](../apps/server/src/config/env.ts) — Adds `FEED_PERSONALIZATION_ENABLED`, `FEED_ROLLOUT_PERCENT`, `FEED_EVENT_SHADOW_MODE`, `FEED_VERSION`, and `FEED_WEIGHTS_JSON`.
- **Dynamic Search (`src/modules/search/`)**:
  - [`search.schema.ts`](../apps/server/src/modules/search/search.schema.ts), [`search.controller.ts`](../apps/server/src/modules/search/search.controller.ts), [`search-query.helper.ts`](../apps/server/src/modules/search/search-query.helper.ts), [`search.service.ts`](../apps/server/src/modules/search/search.service.ts) — Multi-field tokenized search, budget intent parsing (`under 20k`), `pg_trgm` typo fallback, relevance scoring, and cursor pagination (`cursor` / `nextCursor`).

### Background Worker (`apps/workers`)
- [`apps/workers/src/workers/feed.worker.ts`](../apps/workers/src/workers/feed.worker.ts) — Registered in [`apps/workers/src/index.ts`](../apps/workers/src/index.ts):
  - Bounded concurrency (`FEED_WORKER_CONCURRENCY`, default `2`), exponential backoff (`3` attempts), and `feed-events-dlq` dead-letter queue.
  - Bulk-inserts `user_interactions` (`skipDuplicates: true`) and `feed_impressions`.
  - Updates `user_interests` with `0.96` decay + price/location affinity, updates Redis `recent:user:{id}` & `interest:user:{id}`, refreshes `recommendation_candidates`, and cleans expired candidates + impressions older than 30 days every 10 minutes.

### Web Client (`apps/client`)
- [`apps/client/src/features/ads/service/ads.service.ts`](../apps/client/src/features/ads/service/ads.service.ts) & [`apps/client/src/features/ads/hook/useAdsQuery.ts`](../apps/client/src/features/ads/hook/useAdsQuery.ts) — Exports `useInfiniteAdsQuery` using TanStack Query `useInfiniteQuery` with `cursor` / `nextCursor`.
- [`apps/client/src/features/home/pages/HomePage.tsx`](../apps/client/src/features/home/pages/HomePage.tsx) — Clean **Fresh recommendations** grid using `useInfiniteAdsQuery` with **Load more listings** cursor button (no redundant Live Feed badge or Refresh button).
- [`apps/client/src/features/search/pages/SearchPage.tsx`](../apps/client/src/features/search/pages/SearchPage.tsx) — Cursor-paginated search results with **Best Match (`relevance`)**, **Newest First**, **Most Popular**, and price sorting.

---

## 2. Recommendation Algorithm & Ranking Weights

All 6 signals are normalized to `[0, 1]` in `scoreListing`:

| Signal | Default Weight | Logic |
|---|---:|---|
| **Category relevance** | `30%` | `userInterest.interestScore / 25` (cold-start fallback `0.15`) |
| **Location relevance** | `20%` | Exact `locationId` match (`1.0`) or Haversine distance decay (`0.25–1.0`) |
| **Price relevance** | `15%` | Inside user's `avgPriceMin..avgPriceMax` band (`1.0`), soft decay outside |
| **Freshness** | `15%` | `1 / (1 + ageHours / 48)` using `COALESCE(renewedAt, createdAt)` |
| **Engagement** | `10%` | Logarithmic cap `log1p(views*0.05 + favs*1.5 + chats*3) / log1p(50)` |
| **Listing quality** | `10%` | Cover image (`0.45`) + description length (`0.15–0.30`) + `isIdentityVerified` (`0.25`) |

- **Seller Diversity**: `diversifyFeed` caps organic listings per seller (`maxPerSellerPerPage = 2`) per page.
- **Promoted Separation**: Active `FeaturedAd` items (`status: 'ACTIVE'`, `endsAt > NOW()`) are slotted every 5th position without inflating organic scores.
- **Safety Filtering**: Excludes `SOLD`, `DELETED`, `EXPIRED`, `REJECTED` listings and sellers in the `Block` table.

---

## 3. Hybrid Feed Strategy & Redis Key Design

1. **Precomputed + Real-Time + Cold-Start**:
   - Reads cached ordered IDs from Redis `feed:user:{userId}:{loc}` (or `feed:anon:{loc}`).
   - On cache miss, acquires a single-flight lock (`feed:lock:{cacheKey}`, `8s` TTL) and combines `recommendation_candidates`, real-time fresh listings (last `6 hours`), interest-category listings, and popular/cold-start listings.
   - Re-verifies `status = ACTIVE` when hydrating the current page's listings from PostgreSQL.
2. **Redis Keys & TTLs**:
   - `feed:user:{userId}:{loc}` / `feed:anon:{loc}` — jittered `90–150s` TTL
   - `feed:lock:{cacheKey}` — `8s` NX lock
   - `interest:user:{userId}` — `1800s` TTL
   - `recent:user:{userId}` — bounded list (`LTRIM 0 29`, 7d TTL)
   - `trending:{city}:{category}` (`180s` TTL) & `similar:{listingId}:{limit}` (`300s` TTL)
   - `evt:id:{eventId}` (`3600s` NX) & `evt:throttle:{actor}:{type}:{listingId}` (`5–30s` NX)
   - **Fault Tolerance**: If Redis is unavailable, all reads/writes gracefully fall back to PostgreSQL.

---

## 4. API Reference

| Endpoint | Auth | Response Shape |
|---|---|---|
| `GET /api/v1/feed/home` | Optional | `{ items, next_cursor, has_more, feed_version }` |
| `GET /api/v1/feed/trending` | Public | `{ items, next_cursor, has_more, feed_version }` |
| `GET /api/v1/feed/similar/:listing_id` | Public | `{ items, next_cursor, has_more, feed_version }` |
| `POST /api/v1/events` | Optional | `202 { success: true, data: { accepted, duplicates } }` |
| `GET /api/v1/ads` | Public | `{ success: true, data: { ads, pagination: { ..., hasMore, nextCursor }, facets } }` |

---

## 5. Rollout, Feature Flags & Rollback

- **Env Flags**:
  - `FEED_PERSONALIZATION_ENABLED` (`true` / `false`)
  - `FEED_ROLLOUT_PERCENT` (`0`–`100`, deterministic SHA-1 cohort bucketing)
  - `FEED_EVENT_SHADOW_MODE` (`true` / `false`)
  - `FEED_VERSION` (default `'v1'`)
  - `FEED_WEIGHTS_JSON` (optional JSON weight override)
  - `FEED_WORKER_CONCURRENCY` (default `2`)
- **Instant Rollback**: Set `FEED_PERSONALIZATION_ENABLED=false` or `FEED_ROLLOUT_PERCENT=0` to immediately revert `GET /api/v1/feed/home` to cold-start general discovery without touching any database tables or `/api/v1/ads`.

---

## 6. Automated Tests
- Unit tests in [`apps/server/tests/unit/feed-recommendation.test.ts`](../apps/server/tests/unit/feed-recommendation.test.ts) cover ranking signal normalization, logarithmic anti-manipulation, seller diversity, promoted slot separation, opaque cursor pagination under Redis failure, and duplicate `eventId` idempotency.
