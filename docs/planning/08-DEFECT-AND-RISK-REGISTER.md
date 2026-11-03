# Phase 0 Defect and Risk Register

| ID | Severity | Area | Finding | Impact | Recommended action |
|---|---|---|---|---|---|
| R-01 | High | Authentication | Admin login accepts hard-coded credential alternatives in `auth.controller.ts` | Production credentials are not managed safely | Replace with stored hashed credential/SSO and environment-safe bootstrap flow |
| R-02 | High | Authorization | Moderation routes use `requireAuth`; role enforcement is not visible at route boundary | Any authenticated user may reach moderation operations unless controller/business checks prevent it | Add explicit moderator/admin role middleware and negative tests |
| R-03 | High | Admin API | `/admin/stats` is registered before `requireAuth` in `admin.routes.ts` | Marketplace operational metrics are publicly accessible | Protect stats or explicitly document a redacted public stats contract |
| R-04 | High | Data safety | Admin delete permanently removes ad-related rows without a documented recovery process | Accidental deletion can cause irreversible data loss | Add confirmation, audit log, soft-delete/recovery policy and backup verification |
| R-05 | Medium | Admin Users | Users tab has no user list/status API and displays summary text | Admin cannot actually manage accounts | Add paginated user endpoints and connect the page |
| R-06 | Medium | Analytics | Analytics page contains hard-coded values such as views, average price and health | Dashboard can show misleading metrics | Add real aggregate endpoints and label unavailable metrics |
| R-07 | Medium | Admin Messages | Messages tab is informational only | Support/moderation cannot inspect conversations from admin | Add scoped conversation search/detail API |
| R-08 | Medium | Error UX | Admin code uses many `alert` calls and logs errors without visible context | Inconsistent feedback and poor operational UX | Centralize typed API errors and toast/confirmation components |
| R-09 | Medium | E2E quality | E2E script prints blank search total/conversation ID without failing | False-positive regression signal | Assert required response fields and clean up created test data |
| R-10 | Medium | Test data | E2E creates users, ads, favourites and conversations in the running database | Repeated runs pollute shared data | Use isolated test DB or deterministic cleanup |
| R-11 | Low | Documentation | Some legacy docs/test comments may use old project wording | Confusing operator/developer documentation | Run a documentation branding consistency pass |
| R-12 | Low | Scalability | Admin stats trend executes multiple sequential count queries | Dashboard response can slow as data grows | Aggregate in fewer queries and add pagination/caching |

## Risk acceptance boundary

No destructive Prisma schema changes are approved by this audit. Any model change must include:

1. Migration/backward compatibility plan
2. Backup and restore verification
3. Rollback approach
4. Updated seed/test data
5. Targeted regression run
