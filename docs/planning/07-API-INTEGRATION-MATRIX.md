# Phase 0 API Integration Matrix

## Auth

| Endpoint | Method | Consumer | Auth | Status |
|---|---:|---|---|---|
| `/auth/otp/send` | POST | AuthModal | Public | Integrated |
| `/auth/otp/verify` | POST | AuthModal | Public | Integrated |
| `/auth/admin-login` | POST | AdminPortal | Public | Integrated |
| `/auth/refresh` | POST | Session handling | Public/refresh token | Backend available |
| `/auth/me` | GET | AuthContext | Bearer | Integrated |
| `/auth/logout` | POST | AuthContext | Bearer | Integrated |

## Marketplace

| Endpoint | Method | Consumer | Auth | Status |
|---|---:|---|---|---|
| `/categories` | GET | Home, post ad | Public | Integrated |
| `/categories/tree` | GET | Category builder/post ad | Public | Integrated |
| `/categories/:id/attributes` | GET | Post ad/admin post | Public | Integrated |
| `/categories` | POST/PUT/DELETE | Category builder | Role protected | Integrated |
| `/locations/cities` | GET | Navbar/post ad/search | Public | Integrated |
| `/ads` | GET | Home/search | Public | Integrated |
| `/ads` | POST | Post ad/admin post | Bearer | Integrated |
| `/ads/upload-images` | POST | PostAdModal | Bearer | Integrated |
| `/ads/:id` | GET | Ad detail | Public | Integrated |
| `/ads/:id/similar` | GET | Similar listings | Public | Backend available |
| `/ads/:id/contact` | GET | Contact reveal | Backend rule | Integrated |
| `/ads/:id/favourite` | POST | Card/wishlist | Bearer | Integrated |
| `/ads/:id/status` | PATCH | My Ads | Bearer/owner | Integrated |
| `/user/my-ads` | GET | My Ads | Bearer | Integrated |
| `/user/favourites` | GET | Wishlist | Bearer | Integrated |

## Chat and safety

| Endpoint/event | Consumer | Status |
|---|---|---|
| `/chat/conversations` | ChatModal | Integrated |
| `/chat/conversations/:id/messages` | ChatModal | Integrated |
| `/chat/conversations/:id/read` | ChatModal | Integrated |
| Socket `join_conversation` | ChatModal | Integrated |
| Socket `send_message` | ChatModal | Integrated |
| Socket `typing` | ChatModal | Integrated |
| Socket `mark_read` | ChatModal | Integrated |
| `/moderation/reports` | ReportAdModal/admin | Integrated |
| `/moderation/blocks` | Safety flow | Backend available |
| `/moderation/pending` | Admin moderation | Integrated |
| `/moderation/ads/:id/review` | Admin moderation | Integrated |
| `/moderation/reports/:id` | Admin moderation | Backend available |
| `/moderation/ads/:id/boost` | Admin moderation | Backend available |

## Admin

| Endpoint | Consumer | Status |
|---|---|---|
| `/admin/stats` | Dashboard | Integrated; currently route is before auth middleware |
| `/admin/ads` | Manage All Ads | Integrated |
| `/admin/ads/:id/status` | Manage All Ads | Integrated |
| `/admin/ads/:id` | Manage All Ads | Integrated |
| Admin user list/status | Users Management | Missing |
| Admin conversation search | Messages | Missing |
| Persisted settings | Settings | Missing |
| Dedicated analytics metrics | Analytics | Missing/partial |

## Integration gaps

1. Large admin tables need a consistent pagination UI using the backend pagination response.
2. Admin mutations need consistent toast/error handling instead of scattered `alert` calls.
3. Users module requires list, detail and status endpoints.
4. Messages module requires an admin-safe conversation inspection contract.
5. Analytics needs real metrics instead of hard-coded values.
6. Settings needs a persisted configuration model/API or an explicit out-of-scope decision.
