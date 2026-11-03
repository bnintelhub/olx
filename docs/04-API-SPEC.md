# 04. REST API Specification & Socket.io Event Protocol

---

## 1. Overview & Protocol Standards

- **Base URL**: `/api/v1`
- **Protocol**: HTTPS / RESTful JSON
- **Real-Time Gateway**: `wss://api.domain.com/socket.io`
- **Content-Type**: `application/json` (except multi-part uploads)
- **Authentication**: Bearer Token (`Authorization: Bearer <accessToken>`) + Refresh Token stored in HttpOnly secure cookie (`refreshToken`).

---

## 2. Standardized Response & Error Envelopes

### 2.1 Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-25T12:00:00.000Z",
    "requestId": "req-98fbc1-82"
  }
}
```

### 2.2 Cursor-Based Pagination Envelope (Feeds & Feeds Search)
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTI1VDEyOjAwOjAwWiIsImlkIjoiOTk5In0=",
    "hasMore": true,
    "totalCount": 1420
  }
}
```

### 2.3 Standardized Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more input fields failed validation.",
    "details": [
      {
        "field": "price",
        "issue": "Price must be greater than zero."
      }
    ]
  },
  "meta": {
    "timestamp": "2026-10-25T12:00:00.000Z",
    "path": "/api/v1/ads",
    "requestId": "req-98fbc1-82"
  }
}
```

---

## 3. REST API Endpoint Catalog

### 3.1 Authentication & Profile (`/api/v1/auth`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/otp/send` | Public | Send 6-digit OTP to Indian mobile number |
| `POST` | `/auth/otp/verify` | Public | Verify OTP, generate session or register new user |
| `POST` | `/auth/google` | Public | Google OAuth exchange (ID Token -> Session) |
| `POST` | `/auth/refresh` | Public | Rotate refresh token and issue new 15-min JWT |
| `POST` | `/auth/logout` | Authenticated | Invalidate refresh token and clear cookie |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile, role, and unread counts |

#### `POST /auth/otp/send`
*Request:*
```json
{
  "phoneNumber": "+919876543210",
  "purpose": "LOGIN"
}
```
*Response (200 OK):*
```json
{
  "success": true,
  "data": {
    "sessionId": "4a71b123-5e72-46bb-9cf3-e99d7967b29a",
    "expiresInSeconds": 300,
    "resendCooldownSeconds": 45
  }
}
```

#### `POST /auth/otp/verify`
*Request:*
```json
{
  "phoneNumber": "+919876543210",
  "sessionId": "4a71b123-5e72-46bb-9cf3-e99d7967b29a",
  "otp": "482910"
}
```
*Response (200 OK):*
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "2b3cd45e-6f78-49aa-bb01-123456789abc",
      "phoneNumber": "+919876543210",
      "role": "USER",
      "isNewUser": false,
      "profile": {
        "name": "Rahul Sharma",
        "avatarUrl": "https://cdn.domain.com/avatars/user-1.webp",
        "ratingAverage": 4.8
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  }
}
```

---

### 3.2 Categories & Dynamic Attributes (`/api/v1/categories`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/categories` | Public (Cached) | Get complete category taxonomy tree |
| `GET` | `/categories/:slug` | Public (Cached) | Get category metadata by slug |
| `GET` | `/categories/:id/attributes` | Public (Cached) | Get dynamic attribute schema for ad creation/filter |

#### `GET /categories/:id/attributes`
*Response (200 OK):*
```json
{
  "success": true,
  "data": [
    {
      "id": "attr-101",
      "name": "Fuel Type",
      "key": "fuel_type",
      "type": "SELECT",
      "options": ["Petrol", "Diesel", "CNG", "Electric"],
      "isRequired": true,
      "isFilterable": true,
      "unit": null,
      "displayOrder": 1
    },
    {
      "id": "attr-102",
      "name": "KM Driven",
      "key": "kms_driven",
      "type": "NUMBER",
      "options": null,
      "isRequired": true,
      "isFilterable": true,
      "unit": "KM",
      "displayOrder": 2
    }
  ]
}
```

---

### 3.3 Locations & Geography (`/api/v1/locations`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/locations/states` | Public | List all Indian states |
| `GET` | `/locations/cities` | Public | List cities (query by stateId or search query) |
| `GET` | `/locations/localities` | Public | List localities within a city |
| `GET` | `/locations/nearby` | Public | Reverse-geocode lat/lng to nearest City/Locality |

---

### 3.4 Ads & Listings (`/api/v1/ads`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/ads` | Public | Search and browse active ads (feed, filters, geo-radius) |
| `GET` | `/ads/:slug` | Public | Get complete ad detail page data with seller summary |
| `POST` | `/ads` | Authenticated | Create ad draft / submit ad |
| `PUT` | `/ads/:id` | Authenticated | Update ad details |
| `PATCH` | `/ads/:id/status` | Authenticated | Mark ad as `SOLD`, `ARCHIVED`, or renew |
| `POST` | `/ads/presigned-media-urls` | Authenticated | Request presigned S3 URLs for up to 12 images |
| `POST` | `/ads/:id/confirm-media` | Authenticated | Trigger image processing pipeline after direct S3 upload |
| `GET` | `/ads/:id/seller-phone` | Authenticated | Reveal seller phone number (rate-limited, audit-logged) |

#### `GET /ads` (Search & Feed Query Parameters)
*Query String Parameters:*
- `q`: Keyword search string (e.g. `Swift VXI`)
- `categorySlug`: Category filter slug (e.g. `cars`)
- `citySlug`: City slug (e.g. `bengaluru`)
- `lat` / `lng`: User coordinates for radial geo-search
- `radiusKm`: Search radius (e.g. `10`, `25`, `50`)
- `minPrice` / `maxPrice`: Numerical price range
- `attributes[fuel_type]`: Dynamic attribute filter
- `sortBy`: `relevance` | `newest` | `price_asc` | `price_desc`
- `cursor`: Base64 cursor for pagination
- `limit`: Default `20`, max `50`

*Response (200 OK):*
```json
{
  "success": true,
  "data": [
    {
      "id": "ad-uuid-1234",
      "title": "Maruti Suzuki Swift VXi 2020 Manual Petrol",
      "slug": "maruti-suzuki-swift-vxi-2020-bengaluru-ad-1234",
      "price": "580000.00",
      "isNegotiable": true,
      "featuredType": "FEATURED",
      "thumbnailUrl": "https://cdn.domain.com/ads/1234/thumb.webp",
      "location": {
        "city": "Bengaluru",
        "locality": "HSR Layout"
      },
      "attributes": {
        "fuel_type": "Petrol",
        "kms_driven": "38,000 KM",
        "year": "2020"
      },
      "createdAt": "2026-10-24T14:30:00.000Z"
    }
  ],
  "pagination": {
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTI0VDE0OjMwOjAwWiIsImlkIjoiYWQtdXVpZC0xMjM0In0=",
    "hasMore": true,
    "totalCount": 84
  }
}
```

---

### 3.5 Real-Time Chat & Conversations (`/api/v1/chat`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/chat/conversations` | Authenticated | List all conversations for current user (buying & selling) |
| `POST` | `/chat/conversations` | Authenticated | Create or get existing conversation for an ad |
| `GET` | `/chat/conversations/:id/messages` | Authenticated | Get message history with cursor-based pagination |
| `PATCH` | `/chat/conversations/:id/read` | Authenticated | Mark all messages in conversation as read |

---

### 3.6 Wishlist & Saved Searches (`/api/v1/user`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/user/my-ads` | Authenticated | Get user's ads grouped by status (`active`, `pending`, `sold`, `expired`) |
| `GET` | `/user/favourites` | Authenticated | Get user's saved wishlist ads |
| `POST` | `/user/favourites/:adId` | Authenticated | Toggle ad favourite status |
| `GET` | `/user/saved-searches` | Authenticated | Get saved searches with alert preferences |
| `POST` | `/user/saved-searches` | Authenticated | Save current search query filters for instant alerts |

---

### 3.7 Trust, Reports & Reviews (`/api/v1/moderation`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/moderation/reports` | Authenticated | Report an ad or user for fraud/spam |
| `POST` | `/moderation/blocks/:userId` | Authenticated | Block a user from messaging or calling |
| `POST` | `/reviews` | Authenticated | Leave a 1–5 star review for a seller after transaction |

---

### 3.8 Admin Management (`/api/v1/admin`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/metrics` | Admin/Mod | Dashboard metrics (active ads, new users, pending reports) |
| `GET` | `/admin/moderation-queue` | Admin/Mod | Queue of ads needing manual review |
| `PATCH` | `/admin/ads/:id/status` | Admin/Mod | Approve or reject an ad with mandatory reason |
| `GET` | `/admin/reports` | Admin/Mod | List flagged ads and reported users |
| `POST` | `/admin/categories` | Admin Only | Create/edit categories and dynamic attributes |
| `POST` | `/admin/banners` | Admin Only | Upload and schedule hero promotional banners |

---

## 4. Socket.io Real-Time Event Protocol

The WebSocket gateway runs on namespace `/chat` and requires an `accessToken` in the handshake auth object:

```javascript
const socket = io('https://api.domain.com/chat', {
  auth: { token: 'Bearer <accessToken>' }
});
```

### 4.1 Client-to-Server Events (Emit)

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `joinConversation` | `{ "conversationId": "uuid" }` | Client joins conversation room to receive live messages |
| `leaveConversation`| `{ "conversationId": "uuid" }` | Client leaves conversation room |
| `sendMessage` | `{ "conversationId": "uuid", "content": "Is this still available?", "type": "TEXT" }` | Send chat message |
| `typingStart` | `{ "conversationId": "uuid" }` | Notify participant that user is typing |
| `typingStop` | `{ "conversationId": "uuid" }` | Stop typing indicator |
| `markMessagesRead` | `{ "conversationId": "uuid", "messageIds": ["uuid"] }` | Acknowledge message read status |

### 4.2 Server-to-Client Events (Listen)

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `newMessage` | `{ "id": "uuid", "conversationId": "uuid", "senderId": "uuid", "content": "...", "createdAt": "..." }` | Broadcast new message to conversation room |
| `userTyping` | `{ "conversationId": "uuid", "userId": "uuid", "isTyping": true }` | Live typing indicator |
| `messageDelivered` | `{ "messageId": "uuid", "deliveredAt": "..." }` | Delivery receipt |
| `messageRead` | `{ "conversationId": "uuid", "messageIds": ["uuid"], "readAt": "..." }` | Read receipt update |
| `unreadCountUpdate`| `{ "totalUnread": 4, "conversationId": "uuid", "count": 2 }` | Global navbar unread badge sync |

---

## 5. Trade-Offs & Edge Cases

1. **Cursor vs Offset Pagination**:
   - Offset pagination (`OFFSET 2000 LIMIT 20`) causes severe performance degradation in PostgreSQL and leads to duplicate items when new ads are continually inserted at the top of the feed.
   - *Architecture*: Feeds strictly enforce Base64 cursor pagination using compound keys `(created_at, id)`.
2. **Phone Number Scraping Protection**:
   - Publicly displaying phone numbers leads to automated bot scraping and seller harassment.
   - *Architecture*: Phone numbers are masked by default. Revealing a phone number requires an authenticated call to `GET /ads/:id/seller-phone`, which logs an audit entry and rate-limits users to 15 reveals per 24 hours.

---

## 6. Open Questions & Assumptions
- **Assumed**: Chat images are uploaded via direct presigned S3 URLs before emitting a `sendMessage` event with `type: "IMAGE"`.
- **Question**: Should we implement audio voice notes in chat in v1? *(Current assumption: Deferred to v1.5; text, images, and location pins only in v1).*
