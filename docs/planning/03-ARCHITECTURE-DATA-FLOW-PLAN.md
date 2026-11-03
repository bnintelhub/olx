# Architecture और Data Flow Plan

## Frontend flow

```text
Route/View
  -> Shared UI component
  -> API client/request helper
  -> REST endpoint
  -> Controller
  -> Service/business rules
  -> Prisma
  -> MySQL
```

Chat में:

```text
Chat UI -> REST history/load
Chat UI -> Socket.IO authenticated connection
Socket event -> conversation authorization
Socket event -> Prisma message write
Socket event -> room broadcast
```

## Backend module boundaries

| Layer | Responsibility |
|---|---|
| Routes | HTTP method/path और middleware wiring |
| Controllers | Request parsing, response shape और controller-level validation |
| Services | Search, JWT, OTP, chat और reusable business rules |
| Middleware | Auth, role checks, upload और global errors |
| Prisma | Database access और relations |

## Data ownership rules

- `User` identity और role का source of truth है।
- `Profile` public seller information रखता है।
- `Ad` listing lifecycle का source of truth है।
- `CategoryAttribute` post-ad dynamic form का source of truth है।
- `Report` safety workflow का source of truth है।
- `Conversation` buyer/seller access relationship तय करता है।

## API conventions

- Prefix: `/api/v1`
- Protected request: `Authorization: Bearer <access-token>`
- Success response में `success: true` और data।
- Error response में status, code/message और actionable feedback।
- Mutation के बाद affected list/stats को refresh या deterministic local update करें।

## Security flow

1. Auth middleware Bearer token verify करता है।
2. Database से user existence और active status verify होता है।
3. Role middleware admin/moderator permission check करता है।
4. Controller resource ownership check करता है।
5. Error handler safe client message लौटाता है; secrets/stack trace expose नहीं करता।

## Planned technical work

- Repeated `fetch` calls के लिए typed API helper बनाना।
- `any` response types को shared interfaces से replace करना।
- Admin stats, ads और moderation responses के लिए explicit DTO types।
- API error normalization और global toast handling।
- Pagination contract को सभी large admin tables में standardize करना।
- Audit log writes को admin mutations से जोड़ना।
