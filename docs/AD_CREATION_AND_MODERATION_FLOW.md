# Classifieds Ad Creation, Automated Moderation & Marketplace Monetization Specification

> **Platform Reference & Architecture Guide**  
> Comprehensive end-to-end specification for ad submission, multi-tier risk moderation, automated quality checks, and monetization models for the OLX classifieds marketplace.

---

## 1. End-to-End User Ad Creation Flow

When a seller creates a classifieds listing, they proceed through an intuitive, verified, multi-step process:

```
                  ┌──────────────────────────────┐
                  │          CREATE AD           │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │           CATEGORY           │  Select parent & leaf subcategory
                  │    (e.g., Vehicles > Cars)   │  (e.g., Cars, Mobile Phones, Flats)
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │            TITLE             │  Min 10, max 150 characters
                  │  (e.g., Hyundai Creta 2021)  │  Clean, concise, keyword-rich
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │         DESCRIPTION          │  Min 20 characters
                  │    (Condition, specs, use)   │  No spam or raw phone numbers
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │            PRICE             │  Positive INR amount (₹)
                  │    (e.g., ₹52,000 / Neg.)    │  Live Indian words conversion
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │           LOCATION           │  City selection + Locality
                  │   (e.g., Location: Patna)    │  Geocoded coordinates for map
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │          ATTRIBUTES          │  Category dynamic specifications
                  │ (Brand, Model, Year, Fuel)   │  Inherited & validated fields
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │        IMAGES / VIDEO        │  1 to 8 high-resolution photos
                  │    (Cover photo selection)   │  JPEG, PNG, WebP format
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │       PREVIEW LISTING        │  Interactive marketplace card preview
                  │  (Buyer's point of view)     │  Review all details before publishing
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │            SUBMIT            │  POST /api/v1/ads
                  │  (Dispatched to Moderation)  │  Auto-Approve or Moderator Queue
                  └──────────────────────────────┘
```

---

## 2. Server-Side Request & Moderation Pipeline

```
POST /api/v1/ads
     │
     ▼
Validate Request (Schema, Types, Field lengths)
     │
     ▼
Upload & Media Validation (File type, resolution, NSFW check)
     │
     ▼
Spam & Fraud Detection (Keyword blocklists, phone regex, URL stripping)
     │
     ▼
Policy & Duplicate Checks (Image hashes, title similarity, category sanity)
     │
     ▼
Compute Risk Score (0 - 100)
     │
     ├── Low Risk (Score ≤ 25) ────────► AUTO APPROVE ────────► Status: ACTIVE (Live immediately)
     │
     ├── Medium Risk (Score 26 - 70) ──► MODERATOR QUEUE ────► Status: PENDING_REVIEW (Admin dashboard)
     │
     └── High Risk (Score ≥ 71) ───────► AUTO REJECT ────────► Status: REJECTED (With appeal option)
```

---

## 3. Automated Quality & Policy Checks Catalog

Before any listing reaches the live index or a human moderator, the automated inspection engine runs these programmatic checks:

| Check Item | Validation Rule | Action on Violation |
|---|---|---|
| **Title Length** | 10 to 150 characters | Reject with `TITLE_TOO_SHORT` / `TITLE_TOO_LONG` |
| **Description Length** | 20 to 4,000 characters | Reject with `DESCRIPTION_TOO_SHORT` |
| **Price Validity** | Positive number; checked against category outlier thresholds | Flag for review if price is < 10% of median category market value |
| **Category Correctness** | Must be a leaf category node (cannot post directly to root without subcategory) | Reject with `LEAF_CATEGORY_REQUIRED` |
| **Duplicate Listings** | MinHash/Levenshtein text comparison & Perceptual image hashing | Flag as duplicate if > 85% similarity with seller's existing ads |
| **Phone Numbers in Text** | Regex scanning for 10-digit Indian mobile numbers (`^[6-9]\d{9}$`) | Strip / Flag: Buyers must communicate via chat/call shield |
| **Prohibited Keywords** | Blocklist of weapons, drugs, adult items, endangered species, counterfeits | Immediate auto-reject with `PROHIBITED_PRODUCT` |
| **Suspicious URLs** | Detection of external URLs, phishing links, payment bypass schemes | Strip URLs & assign +40 risk points |
| **Excessive Velocity** | Max 5 free ads/month; rate limiter on burst postings (e.g. > 3 ads in 10 mins) | Block until cooldown expires or require paid package |
| **Image Count & Quality** | Minimum 1, maximum 8; max 10MB per image; formats: JPEG, PNG, WebP | Reject upload if zero images or corrupted payload |
| **Account Reputation** | Age of account, verified mobile OTP, past dispute/report record | New accounts with 0 days age get +15 risk baseline |
| **Location Validity** | Must match verified city or locality hierarchy (e.g., Patna, Delhi, Mumbai) | Reject if geocode or location ID is invalid |

---

## 4. Ad State Machine

The ad lifecycle remains simple, deterministic, and decoupled from payments:

```
                    DRAFT
                      │
                      ▼
                  SUBMITTED
                      │
                      ▼
               PENDING_REVIEW
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
      APPROVED                 REJECTED
          │                       │
          ▼                       ▼
       ACTIVE                USER EDITS
          │                       │
    ┌─────┴─────┐                 ▼
    │           │             RESUBMIT
    ▼           ▼
 EXPIRED      SOLD
```

### Database Enums:

```prisma
enum AdStatus {
  DRAFT
  PENDING_REVIEW
  ACTIVE
  REJECTED
  EXPIRED
  SOLD
  DELETED
  SUSPENDED
}

enum ModerationStatus {
  PENDING
  APPROVED
  REJECTED
  FLAGGED
}
```

---

## 5. Three-Level Moderation Architecture

Moderators should **never** manually inspect every benign listing. The system segments traffic by confidence:

### Level 1 — Automatic Approval
- **Profile**: Verified user, established account (> 14 days), normal pricing, valid category, clean photos, no prohibited words.
- **Outcome**: Status set directly to `ACTIVE`. Ad goes live in search index within seconds.

### Level 2 — Moderator Review Queue
- **Profile**:
  - Unusually low price (e.g., iPhone 15 listed for ₹5,000 vs market ₹52,000).
  - High image similarity to an existing ad from a different seller.
  - New account posting multiple high-value items in rapid succession.
  - Moderate keyword flags (ambiguous terms like "first copy", "replica").
- **Outcome**: Placed into Moderator Queue. Requires human approval before appearing in search.

### Level 3 — Automatic Rejection
- **Profile**: Confirmed prohibited products (firearms, prescription narcotics, forged documents), known scam URLs, automated bot payloads.
- **Outcome**: Status set to `REJECTED`. User receives structured notification and can file a support appeal.

---

## 6. Moderator Operational Console

Admin and moderation staff inspect listings with full context and structured decision actions:

```
┌─────────────────────────────────────────────────────────────┐
│  iPhone 15 128GB - Blue                                     │
│                                                             │
│  [IMAGE 1]     [IMAGE 2]     [IMAGE 3]     [IMAGE 4]        │
│                                                             │
│  Price: ₹52,000 (Market Range: ₹48,000 - ₹58,000)          │
│  Category: Mobiles > iPhone                                 │
│  Location: Patna, Bihar                                     │
│  Seller: Rahul Kumar (Verified Phone)                       │
│  Account Age: 42 days · Total Ads: 3 · Reports: 0           │
│                                                             │
│  Calculated Risk Score: 18 / 100 (LOW RISK)                 │
│                                                             │
│  [ ✅ APPROVE ]        [ ⚠️ FLAG ]        [ ❌ REJECT ]     │
└─────────────────────────────────────────────────────────────┘
```

### Standardized Rejection Reasons (No Free-Form Chaos):
1. **`PROHIBITED_ITEM`**: Prohibited, illegal, or restricted goods.
2. **`WRONG_CATEGORY`**: Listing placed under an incorrect category taxonomy.
3. **`DUPLICATE_LISTING`**: Identical item already posted by the seller.
4. **`SUSPICIOUS_CONTENT`**: Suspected fraud, unrealistic claims, or phishing links.
5. **`INVALID_PRICE`**: Unrealistic or placeholder price (e.g., ₹1 or ₹99,999,999).
6. **`MISLEADING_DESCRIPTION`**: Ambiguous, deceptive, or contradictory item details.
7. **`POOR_QUALITY_IMAGE`**: Blurry, watermarked, or stock manufacturer photos only.
8. **`TRADEMARK_VIOLATION`**: Unauthorized brand replication or counterfeit goods.

---

## 7. Marketplace Monetization Architecture

The classifieds model avoids taking high friction commissions from private peer-to-peer deals. Instead, it monetizes **visibility, velocity, and business tools**:

```
                              PLATFORM REVENUE
                                     │
        ┌───────────────────┬────────┴──────────┬───────────────────┐
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
  PAID POSTING         PROMOTIONS          BUSINESS PLANS      SPONSORED ADS
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
 Extra Listings     Boost to Top /       Pro Seller & Dealer     Display Banners
  Above Limit           Featured            Subscriptions         by Category
```

### Revenue Stream #1 — Paid Extra Listings
- **Free Allowance**: 5 free ads per month per user.
- **Listing Packages**:
  - **₹99**: 5 additional ads (valid 30 days)
  - **₹199**: 15 additional ads (valid 60 days)
  - **₹499**: 50 additional ads (valid 90 days)

### Revenue Stream #2 — Boost / Promote Ad (Visibility Engine)
When a listing ranks #300+ in search results, sellers purchase top-of-search boosts:
- **Boost to Top (1x)**: ₹49 (Resets publication timestamp to now, pushing to top of search)
- **Featured Listing (3 Days)**: ₹79 (⭐ Featured badge + highlighted background)
- **Top + Featured (7 Days)**: ₹149 (Pinned top banner + search priority)
- **Auto Boost (7 Days)**: ₹199 (Automatically boosts to top once every 24 hours)

### Revenue Stream #3 — Featured Listings
- Distinct visual badge (`⭐ FEATURED`) on search cards and detail headers.
- Carousel placement on the home page and category exploration landing.
- Guaranteed top 3 slots for matching search keywords.

### Revenue Stream #4 — Dealer & Business Subscriptions
Targeted at car dealers, real estate agents, electronics shops, and refurbishers:

| Plan Tier | Price | Listing Quota | Boosts Included | Key Business Capabilities |
|---|---|---|---|---|
| **Individual** | Free | 5 ads / mo | 0 | Standard classifieds profile |
| **Pro Seller** | ₹499 / mo | 50 ads | 10 monthly boosts | Verified Seller badge, basic analytics |
| **Dealer** | ₹1,999 / mo | 500 ads | 40 monthly boosts | Branded dealer showroom page, lead phone tracking, priority moderation |
| **Enterprise** | ₹9,999+ / mo | Unlimited | Custom bundles | Inventory Sync API, multi-seat team logins, dedicated account manager |

### Revenue Stream #5 — Display & Sponsored Advertising
- Category-targeted banner placements (e.g., Car insurance sponsored banner on Vehicles page).
- City/locality-targeted sponsored ads (e.g., Patna real estate brand banner).
- Impression / click metrics tracked independently from ad listings.

---

## 8. Turbo Monorepo System Separation

```
apps/
├── client/     # Public buyer & seller portal (React, Vite, Tailwind, Zustand)
├── admin/      # Backoffice operations, moderation queues, analytics, user trust
├── server/     # Fastify REST API, authentication, RBAC, listing engine
└── worker/     # BullMQ asynchronous background tasks & job processing

server/src/modules/
├── auth/           # JWT, sessions, passwordless OTP
├── users/          # Profiles, verification badges, KYC
├── listings/       # CRUD, location associations, specs cache
├── categories/     # Hierarchy tree, dynamic specifications
├── locations/      # Indian cities, districts, localities (Patna, Delhi, etc.)
├── media/          # Atomic image uploads, Sharp optimization
├── moderation/     # Risk evaluation, queues, audit log trails
├── promotions/     # Boost packages, featured status expiration
├── payments/       # Razorpay / Cashfree order webhooks
└── reports/        # Safety complaints, dispute resolution

worker/src/jobs/
├── image-processing       # Sharp thumbnails, WebP conversion, watermarking
├── moderation-jobs        # Async duplicate checks, perceptual hashing
├── ad-expiry              # Nightly cron expiring ads after 30 days
├── auto-boost             # Scheduled recurring 24h boost bumps
└── payment-webhooks       # Asynchronous transaction confirmation
```

---

## 9. Core Database Relationships

```
User (Seller)
  │
  ├── Ad (1 : N)
  │     ├── AdImages (1 : N)
  │     ├── AdAttributeValues (1 : N)
  │     ├── ModerationReview (1 : 1)
  │     ├── AdReports (1 : N)
  │     ├── AdPromotions (1 : N)
  │     └── AdEventLogs (1 : N)
  │
  ├── UserSubscription (1 : 1)
  └── UserAuditLogs (1 : N)
```

> [!IMPORTANT]
> **Decoupled Architecture**: Moderation state (`moderation.status = APPROVED`) is strictly separated from financial transactions (`promotion.paymentStatus = PAID`). An ad cannot buy its way out of safety policies; payment boosts visibility only after safety approval is secured.

