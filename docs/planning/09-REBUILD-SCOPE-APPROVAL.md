# Phase 0 Rebuild Scope Approval

## Preserve

- Existing React/Vite customer application and routes
- Existing `/api/v1` API contract unless versioned
- Prisma/MySQL models and existing data
- OTP, JWT, ad posting, search, favourites and chat behavior
- Socket.IO event names used by the current customer UI
- Docker Compose ports and health check behavior

## Replace or refactor

- Large duplicated admin layout inside `AdminPortal.tsx`
- Hard-coded admin summary metrics
- Placeholder Users, Messages and Settings modules
- Scattered admin `alert`/`console.error` feedback
- Weak E2E assertions and shared-database test pollution
- Hard-coded admin credential strategy

## Add

- Shared admin shell and design-system primitives
- Typed API client/error normalization
- Admin user management API and UI
- Real analytics aggregates
- Admin conversation inspection with privacy/role controls
- Settings persistence boundary
- Audit logs for admin mutations
- Role-protected moderation routes
- Stronger E2E assertions and isolated test setup

## Do not do during rebuild

- Do not rename or drop existing Prisma models without migration approval.
- Do not reset or delete the production database.
- Do not replace working customer flows merely for visual refactoring.
- Do not expose phone numbers, private chat content or credentials in new admin APIs by default.
- Do not treat hard-coded demo values as production metrics.

## Approval gate

Phase 1 can start after the team confirms:

- [ ] Git repository/baseline commit is available.
- [ ] Production database backup and migration process is documented.
- [ ] Admin role matrix is approved.
- [ ] Users, analytics, messages and settings scope is approved.
- [ ] Shared component naming and design tokens are approved.
