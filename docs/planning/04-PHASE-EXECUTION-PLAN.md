# Phase-wise Execution Plan

## Phase 0 — Audit & Baseline

### Work

- Existing screens, routes और Prisma models inventory करना।
- Current build, health endpoint और E2E baseline चलाना।
- Missing admin APIs identify करना।
- Existing dirty/unrelated changes preserve करना।

### Done when

- Baseline report और API/module map तैयार हो।
- Build command reproducible हो।

## Phase 1 — UI Foundation & Admin Shell

### Status: Foundation implemented

### Work

- Existing `/admin` entry और responsive sidebar/header preserve किए गए हैं।
- Reusable admin primitives added under `frontend/src/admin/components`:
  - `AdminPageHeader`
  - `AdminDataTable`
  - `AdminFilterBar`
  - `AdminStatusBadge`
  - `AdminConfirmDialog`
  - `AdminLoadingState`, `AdminEmptyState`, `AdminErrorState`
  - `AdminErrorBoundary`
- Live Listings और Moderation screens में page header, status badge, loading और empty states integrate किए गए हैं।
- Admin view को error boundary से protect किया गया है।

### Remaining Phase 1 work

- Existing large `AdminPortal.tsx` को feature-level files में incrementally split करना।
- Generic table/filter/confirm primitives को Users, Categories और Reports screens में wire करना।
- Toast provider जोड़ना और remaining `alert` calls replace करना।

### Done when

- सभी admin tabs एक ही shell render करें।
- Desktop और mobile fallback usable हो।

## Phase 2 — Authentication & RBAC

### Status: Implemented and verified

### Work

- Environment-backed admin credentials और rate-limited admin login।
- Admin session restore via `/auth/me`, refresh-token rotation और logout revocation।
- Invalid/non-admin sessions का customer site पर redirect।
- Admin/moderator action guards और sidebar visibility filtering।
- Backend role checks on stats, ads, moderation और category operations।
- Audit logs for sensitive mutations, failed login और denied authorization.

### Done when

- Non-admin protected action पर 403 मिलता है।
- Refresh के बाद valid admin session restore होती है।

## Phase 3 — Dashboard & Analytics

**Status: Implemented and build/E2E validated.** See
[Phase 3 implementation notes](11-PHASE-3-DASHBOARD-ANALYTICS-IMPLEMENTATION.md).

### Work

- Database-backed KPI cards, trends, category and city breakdown।
- Pending moderation, recent reports and audit activity widgets।
- API loading/error/empty/retry states।
- Date range filtering with a single consolidated stats request।

### Done when

- Dashboard live backend data दिखाता है और stale data silently नहीं दिखाता।

## Phase 4 — Listings & Moderation

**Status: Implemented and build/E2E validated.** See
[Phase 4 implementation notes](12-PHASE-4-LISTING-MANAGEMENT-IMPLEMENTATION.md).

### Work

- Server-side listing table filters, sorting और pagination।
- Listing detail drawer with media, seller, attributes, reports और history।
- Validated status transitions, rejection reason, duplicate-action protection।
- Audit logging and seller notifications for moderation decisions।
- Approve/reject reason और refresh behavior।

### Done when

- Listing lifecycle UI और database status consistent हों।

## Phase 5 — Users & Safety

**Status: Implemented and build/E2E validated.** See
[Phase 5 implementation notes](13-PHASE-5-USER-MANAGEMENT-AND-SAFETY-IMPLEMENTATION.md).

### Work

- Server-side user list, search, filters और pagination।
- Profile drawer with verification, listings, reports और audit history।
- Role-aware suspend, ban, deactivate, restore और anonymization actions।
- Dealer/business classification and controlled contact visibility।

### Done when

- Suspended/banned user behavior documented और tested हो।

## Phase 6 — Categories & Locations

### Work

- Category tree management।
- Dynamic attribute builder।
- Required/filterable/options/unit validation।
- Location administration यदि API scope में है।

### Done when

- Admin schema update के बाद customer post-ad form correct fields render करे।

## Phase 7 — Chat, Reports & Support

### Work

- Conversation search/context।
- Socket reconnect/error state।
- Read/unread consistency।
- Safety escalation और message/report linking।

### Done when

- REST fallback और Socket.IO live path दोनों verified हों।

## Phase 8 — Settings & Monetization

### Work

- Settings groups और safe edit forms।
- Featured/urgent/home spotlight boost management।
- Future billing/payment integration boundary।

### Done when

- Secrets UI से बाहर हों और changes audited हों।

## Phase 9 — QA, Security & Release

### Work

- Full build/type-check।
- Critical E2E flows।
- Auth/RBAC negative tests।
- Upload, chat और moderation regression।
- Docker production smoke test।

### Done when

- Release checklist complete और rollback plan available हो।
