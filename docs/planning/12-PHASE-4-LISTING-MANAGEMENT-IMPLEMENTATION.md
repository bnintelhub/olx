# Phase 4 — Listing management and moderation

## Status

Implemented and build/E2E validated.

## Admin listing API

`GET /api/v1/admin/ads` is authenticated and supports bounded server-side
pagination with:

- status
- category
- city/location
- seller ID
- reported/unreported
- keyword or listing ID
- minimum and maximum price
- creation date range
- sorting by creation, update, price or expiry

Soft-deleted listings are excluded from the management list. Invalid dates,
price ranges, statuses and pagination values return explicit validation errors.

`GET /api/v1/admin/ads/:id` provides the detail view contract:

- all media URLs
- description, price, expiry and dynamic attributes
- category and location
- seller profile/account state
- linked reports
- moderation/audit history

## Moderation safety

Status changes now enforce a server-side transition matrix. Duplicate actions
and concurrent moderator changes return a conflict instead of silently
overwriting the first decision.

Rejections require a reason. Every sensitive status change records the acting
moderator, previous state and new state in `AuditLog`. Approval/rejection also
creates an in-app notification for the seller.

The moderation review endpoint only accepts listings currently in
`PENDING_REVIEW`, which prevents stale review screens from changing a listing
after another moderator has already decided.

## Admin UI

The Manage All Ads screen now includes:

- server-backed filters and pagination
- price/date/seller/report filters
- sorting controls
- thumbnail, title, ID, category, price, seller, location and status columns
- listing detail drawer with images, attributes, seller, reports and history
- explicit approval confirmation
- bounded bulk status actions for selected listings with explicit confirmation

The moderation desk requires a rejection reason and explicit confirmation
before submitting a rejection.

## Verification

- Backend TypeScript build: passed
- Frontend TypeScript/Vite production build: passed
- Full platform E2E suite: passed, including anti-fraud pending review and
  admin approval
