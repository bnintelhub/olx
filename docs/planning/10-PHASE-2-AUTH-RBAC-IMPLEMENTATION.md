# Phase 2 — Authentication, Sessions and Permissions

## Status

Core Phase 2 implementation is complete and verified. The current schema supports `ADMIN` and `MODERATOR`; proposed `SUPER_ADMIN` and `SUPPORT` roles are not added without an approved Prisma migration.

## Implemented

- Admin login remains at `POST /api/v1/auth/admin-login`.
- Admin credentials are environment-backed:
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD_HASH` for production
  - development-only `ADMIN_PASSWORD`
- Admin login has an IP + username rate limit.
- Failed admin login attempts are written to `AuditLog`.
- Admin logout revokes the stored refresh-token hash and writes an audit event.
- Admin session restore calls `/auth/me` instead of trusting local storage.
- Expired admin access tokens use refresh-token rotation.
- Invalid, expired or non-admin sessions are cleared and redirected to the customer site.
- Admin and moderator visibility is filtered in the admin sidebar.
- `/admin/stats` is protected by authentication and admin/moderator role.
- Moderation queue, review, report resolution and boost routes require admin/moderator role.
- Category create/update allows admin/moderator; category and attribute deletion remains admin-only.
- Admin ad status changes, ad deletion, moderation actions, category mutations and authorization denials write audit logs.

## Verified role behavior

| Action | Admin | Moderator | Regular user |
|---|---:|---:|---:|
| Admin stats | Allowed | Allowed | Rejected |
| Manage admin ads | Allowed | Allowed | Rejected |
| Review pending ads | Allowed | Allowed | Rejected |
| Resolve reports | Allowed | Allowed | Rejected |
| Boost ads from moderation | Allowed | Allowed | Rejected |
| Create/update categories | Allowed | Allowed | Rejected |
| Delete categories/attributes | Allowed | Rejected | Rejected |
| Customer ad/chat actions | Allowed | Allowed | Allowed by ownership rules |

## Validation

- `npm run build` passed.
- `npm run test:e2e` passed after updating the moderation step to use an admin token.
- Explicit regular-user request to `GET /api/v1/moderation/pending` returned `403`.

## Remaining hardening

- Replace development `ADMIN_PASSWORD` with a generated bcrypt `ADMIN_PASSWORD_HASH` before production.
- Move admin bootstrap to a one-time provisioning flow instead of automatic credential-based upsert.
- Add persistent login-attempt tracking if multi-instance/global lockout is required.
- Add dedicated `SUPER_ADMIN` and `SUPPORT` roles only with a migration and approved permission matrix.
- Add admin user/role-management endpoints and UI.
- Add automated audit-log assertions and cleanup/isolation for E2E data.
