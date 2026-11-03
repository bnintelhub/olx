# Phase 5 — User management and safety

## Status

Implemented and build/E2E validated.

## Admin user API

The protected admin API now provides:

- `GET /api/v1/admin/users`
  - pagination
  - ID, name, phone and email search
  - account status filter
  - role filter
  - individual/dealer/business classification filter
- `GET /api/v1/admin/users/:id`
  - profile and verification state
  - account status and last login
  - active, pending, rejected, sold and other user listings
  - reports received
  - previous audit/account actions
- `PATCH /api/v1/admin/users/:id/action`
  - suspend
  - unsuspend
  - ban
  - deactivate
  - restore
  - delete/anonymize
  - classify as individual, dealer or business

## Authorization and privacy

Only administrators can change account state. Moderators can use the
support-style listing/detail view, but contact information is masked for them.
Privileged administrator and moderator accounts cannot be changed through this
user safety workflow, and an administrator cannot act on their own account.

Every mutating action requires a reason, is confirmed in the UI, and creates an
audit record with the acting administrator, previous state, next state and
reason.

## Session and listing safety

- Suspending, banning or deleting a user clears `refreshTokenHash`, causing
  existing access-token checks and future refresh attempts to fail.
- Banned or deleted sellers' active listings are archived and hidden from the
  marketplace.
- Restoring a banned account does not automatically republish listings; any
  archived listings are moved to pending review for a fresh moderation decision.
- Delete/anonymize clears direct contact and profile-identifying data while
  retaining the audit/account record required for operational history.

The additive `Profile.accountType` and `Profile.businessName` fields were
applied through Prisma schema synchronization. No destructive schema change was
introduced.

## Admin UI

The Users & Safety screen now includes:

- server-side search and pagination
- status, role and account-type filters
- verification indicators
- controlled contact display
- profile detail drawer
- user listings and reports
- previous account actions
- mandatory-reason safety actions
- dealer/business classification
- suspend, unsuspend, ban, deactivate, restore and delete/anonymize actions

## Verification

- Prisma schema synchronized successfully
- Backend TypeScript build: passed
- Frontend TypeScript/Vite production build: passed
- User list/detail endpoints: verified against the running API
- Administrator self-action protection: verified with HTTP 409
- Full platform E2E suite: passed
