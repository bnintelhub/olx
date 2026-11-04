# OLX ORBIT

OLX ORBIT भारत के लिए बनाया गया mobile-first peer-to-peer classifieds marketplace है। इसमें users cars, bikes, mobiles, electronics, furniture, properties, jobs और services जैसी categories में listing देख सकते हैं, search कर सकते हैं, ad publish कर सकते हैं और buyer-seller chat कर सकते हैं।

यह README वर्तमान codebase की architecture, modules, data flow, admin portal और local setup को समझाने के लिए है।

## 1. Project Summary

### मुख्य capabilities

- Phone OTP आधारित login/register
- Category और city आधारित ad discovery
- Keyword, category, city, price और sorting के साथ search
- Dynamic category attributes, जैसे fuel type, kms driven, storage और BHK
- Authenticated user द्वारा images के साथ ad posting
- My Ads में listing status manage करना
- Wishlist/favourites
- Buyer-seller conversations और real-time Socket.IO messaging
- Listing report, user block और moderation workflow
- Admin dashboard, ad moderation, category builder और admin publishing
- PWA manifest और service worker
- MySQL persistence और Prisma ORM

### Current implementation

यह repository functional React + Express application है। कुछ enterprise features जैसे payment gateway, production SMS provider setup, CDN/S3 media pipeline और advanced analytics का architecture documentation में उल्लेख हो सकता है, लेकिन वर्तमान runtime में मुख्यतः local uploads, MySQL, JWT, REST और Socket.IO लागू हैं।

## 2. Technology Stack

| Layer | Technology | उपयोग |
|---|---|---|
| Customer frontend | React 18, TypeScript, Vite | Home, search, listing, chat और user flows |
| Styling/UI | Tailwind CSS, Lucide React | Responsive UI और icons |
| Admin frontend | React + Vite SPA | `/admin` portal और management modules |
| Backend | Node.js, Express, TypeScript | REST API, validation और business logic |
| ORM/database | Prisma + MySQL 8.4 | Relational data और relationships |
| Authentication | JWT access/refresh tokens | User और admin sessions |
| OTP | Configurable MOCK, MSG91 या TWILIO provider | Phone login/registration |
| Real-time | Socket.IO | Chat, typing indicator और read receipts |
| Uploads | Multer + local `/uploads` directory | Ad images |
| Security | Helmet, CORS, Zod, role middleware | Headers, origin control, env validation और RBAC |
| Deployment | Docker Compose, Nginx | MySQL, backend और frontend containers |

## 3. High-Level Architecture

```mermaid
flowchart LR
    Browser["React/Vite Customer or Admin UI"]
    Nginx["Nginx / Vite Dev Proxy"]
    API["Express API<br/>/api/v1"]
    Socket["Socket.IO Server"]
    Prisma["Prisma ORM"]
    DB[("MySQL 8.4")]
    Uploads[("Local uploads volume")]

    Browser --> Nginx
    Nginx --> API
    Browser --> Socket
    API --> Prisma
    Prisma --> DB
    API --> Uploads
    Socket --> Prisma
```

### Request flow

1. Browser React components API को `/api/v1` पर call करते हैं।
2. Express route request को controller तक भेजता है।
3. Protected routes में `requireAuth` JWT verify करता है और database से active user check करता है।
4. Controller Prisma के माध्यम से MySQL में read/write करता है।
5. Standard response JSON में `success`, `data` या error information लौटती है।
6. Chat के लिए REST history/load और Socket.IO live events दोनों उपयोग होते हैं।

### Repository structure

```text
olx/
├── frontend/
│   ├── src/
│   │   ├── components/       # Customer और admin UI modules
│   │   ├── context/          # AuthContext
│   │   ├── utils/            # Wishlist जैसे client helpers
│   │   ├── types/            # Shared frontend types
│   │   ├── App.tsx           # View routing और global modal state
│   │   └── main.tsx          # React entry point
│   ├── public/               # Manifest, service worker और static assets
│   └── Dockerfile
├── backend/
│   ├── src/
│   │   ├── routes/           # API route registration
│   │   ├── controllers/      # HTTP handlers
│   │   ├── services/         # JWT, OTP, search और Socket.IO
│   │   ├── middleware/       # Auth, upload और error handler
│   │   ├── config/           # Environment validation
│   │   └── prisma.ts         # Prisma client
│   ├── prisma/
│   │   ├── schema.prisma     # MySQL schema
│   │   └── seed*.ts          # Seed/data maintenance scripts
│   └── Dockerfile
├── docs/                     # Product, API, security और deployment docs
├── tests/                    # PowerShell E2E test flow
├── docker-compose.yml
└── package.json
```

## 4. Customer Application Modules

### Home and discovery

- `Navbar`: logo, search, city selection, login, wishlist, chat, My Ads और admin entry.
- `HeroBanner`: primary search/discovery area.
- `CategoriesRibbon` और `CategoryGrid`: category navigation.
- Recommendation feed newest ads को `/api/v1/ads?limit=12&sort=newest` से लाता है।
- `AdCard`: listing preview, price, location और favourite action।

### Search

`SearchPage` `/api/v1/ads` को query parameters के साथ call करता है। User keyword, category, city, min/max price और sort के आधार पर listings filter कर सकता है। Listing पर click करने पर `AdDetailModal` खुलता है।

### Authentication

`AuthModal` का flow:

1. User phone number देता है।
2. Frontend `/api/v1/auth/otp/send` call करता है।
3. OTP verify होने पर `/api/v1/auth/otp/verify` JWT tokens देता है।
4. `AuthContext` user session restore, current user और logout handle करता है।
5. Expiry और refresh के लिए access/refresh token mechanism उपलब्ध है।

Development में `SMS_PROVIDER=MOCK` और `MOCK_OTP_CODE` उपयोग किया जा सकता है।

### Post Ad

`PostAdModal`:

1. Category tree और cities load करता है।
2. Selected category की dynamic attributes load करता है।
3. अधिकतम configured image files upload endpoint पर भेजता है।
4. Title, description, price, location और attributes के साथ ad create करता है।
5. Listing सामान्यतः `PENDING_REVIEW` state में जाती है और admin review के बाद active होती है।

### My Ads और favourites

- `MyAdsModal` user की अपनी listings दिखाता है और status update/mark sold flow देता है।
- `WishlistModal` favourite ads दिखाता है।
- Favourite toggle `/api/v1/ads/:id/favourite` से होता है।

### Ad details और contact

`AdDetailModal` listing details, images, seller information, similar listings और contact action दिखाता है। Contact information protected endpoint से आता है और logged-in access rules लागू होते हैं।

### Chat

`ChatModal`:

- Conversation list और message history REST से load करता है।
- Socket.IO से authenticated connection बनाता है।
- `join_conversation`, `send_message`, `typing`, `mark_read` और `leave_conversation` events उपयोग करता है।
- Messages database में persist होते हैं।
- Unread counts और read status conversation में maintain होते हैं।
- Message content में UPI, Google Pay, PhonePe, advance, token money, QR code और PIN जैसे fraud-risk terms मिलने पर warning metadata भेजा जाता है।

### Safety

- User listing को report कर सकता है।
- User दूसरे user को block कर सकता है।
- Report reasons में spam/fraud, inappropriate content, prohibited item, misleading price, duplicate और already sold शामिल हैं।

## 5. Admin Portal

Admin portal customer site से अलग authenticated SPA view है। इसे `/admin` path या `?view=admin` से खोला जा सकता है। Admin login `/api/v1/auth/admin-login` से होता है और session token local storage में persist होता है।

### Dashboard Overview

- Total ads, active, pending, rejected और sold counts
- Total categories, users, reports और conversations
- Category breakdown
- Recent ads
- Date-wise trend data
- Pending moderation और quick action links

### Post New Listing

Admin verified listing की तरह ad publish कर सकता है। Category चुनने पर dynamic specification schema आता है। Admin title, description, price, location, image URL और category-specific attributes भरकर ad create कर सकता है।

### Categories & Specs

`AdminCategoryBuilder` से:

- Root और child categories manage की जा सकती हैं।
- Category name, description और hierarchy बनाई जा सकती है।
- Category attributes add/edit/delete किए जा सकते हैं।
- Attribute types `TEXT`, `NUMBER`, `BOOLEAN`, `SELECT`, `MULTI_SELECT` और `DATE` हैं।
- Required, filterable, unit और display order configure किए जा सकते हैं।

इससे अलग-अलग category के लिए अलग form fields और search filters बनते हैं, बिना frontend में हर field hard-code किए।

### Manage All Ads

- सभी ads की सूची
- Status filter: active, pending, rejected, sold आदि
- Category filter
- Search
- Admin status update
- Listing delete
- Listing detail/open action

### Users Management

Admin navigation में user management module मौजूद है। इसका उद्देश्य user accounts, role/status और account operations को manage करना है। Backend user model में `GUEST`, `USER`, `MODERATOR`, `ADMIN` roles तथा `ACTIVE`, `SUSPENDED`, `BANNED`, `DELETED` statuses हैं।

### Reports & Analytics

- Dashboard statistics और trend visualization
- Category-wise distribution
- Recent activity
- Operational reporting के लिए summary cards

### Comments & Messages

Admin navigation में comments/messages workspace है। Conversation data backend में buyer, seller, messages और unread counters के साथ store होता है। Live chat operations Socket.IO से चलते हैं।

### Safety & Fraud Desk

- Pending ads moderation queue
- Reported ads/users की सूची
- Approve, reject या review action
- Report resolve/dismiss action
- Ad boost types जैसे `FEATURED`, `URGENT`, `HOME_SPOTLIGHT`
- Fraud और policy violations के लिए review workflow

### Settings

Admin settings area application-level operational settings के लिए रखा गया है। Runtime secrets और environment configuration `.env`/deployment configuration से नियंत्रित होते हैं।

### Admin authorization

Backend पर:

- `requireAuth` Bearer JWT validate करता है।
- User active है या नहीं, database से verify होता है।
- `requireRole(UserRole.ADMIN, UserRole.MODERATOR)` जैसे guards category/moderation actions को restrict करते हैं।
- Delete category और attribute जैसे destructive actions ADMIN-only हैं।

## 6. Backend API Modules

सभी endpoints `/api/v1` के नीचे mounted हैं।

| Module | प्रमुख endpoints | काम |
|---|---|---|
| Auth | `/auth/otp/send`, `/auth/otp/verify`, `/auth/admin-login`, `/auth/me`, `/auth/refresh`, `/auth/logout` | Login, registration, admin auth और sessions |
| Categories | `/categories`, `/categories/tree`, `/categories/:id/attributes` | Category tree और dynamic specs |
| Locations | `/locations/cities` | City/location data |
| Ads | `/ads`, `/ads/:id`, `/ads/upload-images`, `/ads/:id/favourite` | Search, CRUD, images और favourites |
| User | `/user/my-ads`, `/user/favourites` | Current user data |
| Chat | `/chat/conversations`, `/chat/conversations/:id/messages` | Conversations और message history |
| Moderation | `/moderation/pending`, `/moderation/reports`, `/moderation/ads/:id/review` | Review और reports |
| Admin | `/admin/stats`, `/admin/ads`, `/admin/ads/:id/status` | Admin statistics और listing management |
| Health | `/health` | Service/database health response |

## 7. Database Design

Prisma schema [packages/database/prisma/schema.prisma](../packages/database/prisma/schema.prisma) में PostgreSQL के लिए defined है।

### Identity

- `User`: phone/email, verification flags, role, status और tokens
- `Profile`: name, avatar, bio, location और ratings
- `OtpSession`: hashed OTP, attempts, purpose और expiry

### Catalog

- `Location`: state/city/locality hierarchy और coordinates
- `Category`: parent-child category tree
- `CategoryAttribute`: dynamic form/filter schema
- `Ad`: listing owner, category, location, price, status और timestamps
- `AdImage`: listing images
- `AdAttributeValue`: category-specific values

### Engagement

- `Favourite`
- `SavedSearch`
- `Conversation`
- `Message`
- `Notification`
- `Review`

### Trust and operations

- `Report`
- `Block`
- `FeaturedAd`
- `Banner`
- `AuditLog`

### Ad lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_REVIEW: User/Admin submits
    PENDING_REVIEW --> ACTIVE: Approved
    PENDING_REVIEW --> REJECTED: Policy issue
    REJECTED --> PENDING_REVIEW: User edits/resubmits
    ACTIVE --> SOLD: Seller marks sold
    ACTIVE --> EXPIRED: Expiry
    ACTIVE --> ARCHIVED: User/Admin archives
    EXPIRED --> ACTIVE: Renew
```

## 8. Security and Reliability

- Helmet security headers enabled हैं।
- CORS configured client URL और local development origins के लिए है।
- Environment variables Zod schema से validate होते हैं; invalid required config पर server start नहीं होता।
- Password/OTP values plain text में persist नहीं की जानी चाहिए; OTP session expiry और attempt tracking schema में है।
- JWT access और refresh secrets अलग हैं।
- Protected routes Bearer token और active-user check का उपयोग करते हैं।
- Role-based authorization admin/moderator operations पर लागू है।
- Multer upload middleware image upload handling के लिए उपयोग होता है।
- Global error handler API errors को centralized तरीके से handle करता है।
- Chat में conversation ownership verify होती है, इसलिए user केवल अपनी buyer/seller conversation access कर सकता है।

Production में `.env` secrets, strong JWT secrets, real SMS provider, HTTPS, managed database backup और object storage जरूर configure करें।

## 9. Local Development

### Prerequisites

- Node.js 18+ (Node.js 20 LTS recommended)
- npm
- Docker Desktop, यदि Compose database/backend/frontend चलाना हो
- MySQL 8.4 या Docker MySQL

### Install

```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
```

Backend में `backend/.env` बनाकर कम-से-कम ये values दें:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL="mysql://olx_user:olx_secret_pass@localhost:3306/olx_marketplace"
JWT_ACCESS_SECRET="replace-with-a-long-development-secret"
JWT_REFRESH_SECRET="replace-with-another-long-development-secret"
SMS_PROVIDER=MOCK
MOCK_OTP_CODE=123456
```

### Database and seed

```powershell
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:push
npm --prefix backend run prisma:seed
```

### Run frontend and backend

दो अलग terminals में:

```powershell
npm run dev:backend
npm run dev:frontend
```

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/api/v1/health`
- Admin: `http://localhost:5173/admin`

### Docker Compose

```powershell
docker compose up --build -d
docker compose down
```

Compose में तीन services हैं:

1. `mysql`: persistent MySQL data volume
2. `backend`: Express API और Socket.IO, port `5000`
3. `frontend`: built React app और Nginx, port `80`

## 10. Build and Test

```powershell
# Backend और frontend दोनों build
npm run build

# E2E PowerShell flow
npm run test:e2e
```

Frontend build में TypeScript check और Vite production bundle शामिल है। Backend build TypeScript compiler से होता है।

## 11. Related Documentation

| File | विषय |
|---|---|
| [01-PRD.md](01-PRD.md) | Product vision, personas और requirements |
| [02-SYSTEM-ARCHITECTURE.md](02-SYSTEM-ARCHITECTURE.md) | विस्तृत architecture plan |
| [03-DATABASE-SCHEMA.md](03-DATABASE-SCHEMA.md) | Data model और schema reference |
| [04-API-SPEC.md](04-API-SPEC.md) | REST/Socket protocol reference |
| [AUTH_WORKFLOW.md](AUTH_WORKFLOW.md) | Fastify Authentication, BullMQ Email OTP Queue, and API Payloads |
| [RBAC_WORKFLOW.md](RBAC_WORKFLOW.md) | Role-Based Access Control, Granular Permissions, and Capabilities |
| [05-UI-UX-PLAN.md](05-UI-UX-PLAN.md) | UI/UX plan और responsive layouts |
| [06-SECURITY-AND-COMPLIANCE.md](06-SECURITY-AND-COMPLIANCE.md) | Security और compliance guidance |
| [07-SEARCH-AND-RECOMMENDATION.md](07-SEARCH-AND-RECOMMENDATION.md) | Search और recommendation design |
| [08-DEVOPS-AND-TESTING.md](08-DEVOPS-AND-TESTING.md) | Deployment और testing strategy |
| [09-IMPLEMENTATION-ROADMAP.md](09-IMPLEMENTATION-ROADMAP.md) | Phase-wise implementation plan |

### Detailed implementation planning

वर्तमान implementation को execute करने के लिए detailed planning notes [planning/](planning/) folder में हैं:

- [Planning overview](planning/00-PLANNING-OVERVIEW.md)
- [Design system और admin shell](planning/01-DESIGN-SYSTEM-AND-ADMIN-SHELL.md)
- [Admin modules plan](planning/02-ADMIN-MODULES-PLAN.md)
- [Architecture और data flow plan](planning/03-ARCHITECTURE-DATA-FLOW-PLAN.md)
- [Phase execution plan](planning/04-PHASE-EXECUTION-PLAN.md)
- [QA, acceptance और release checklist](planning/05-QA-ACCEPTANCE-AND-RELEASE.md)
- [Phase 0 audit report](planning/06-PHASE-0-AUDIT-REPORT.md)
- [API integration matrix](planning/07-API-INTEGRATION-MATRIX.md)
- [Defect and risk register](planning/08-DEFECT-AND-RISK-REGISTER.md)
- [Rebuild scope approval](planning/09-REBUILD-SCOPE-APPROVAL.md)
- [Phase 2 auth/RBAC implementation](planning/10-PHASE-2-AUTH-RBAC-IMPLEMENTATION.md)
- [Phase 3 dashboard and analytics implementation](planning/11-PHASE-3-DASHBOARD-ANALYTICS-IMPLEMENTATION.md)
- [Phase 4 listing management and moderation](planning/12-PHASE-4-LISTING-MANAGEMENT-IMPLEMENTATION.md)
- [Phase 5 user management and safety](planning/13-PHASE-5-USER-MANAGEMENT-AND-SAFETY-IMPLEMENTATION.md)

## 12. Important Notes

- README में वर्णित modules वर्तमान codebase के नाम और routes के अनुसार हैं।
- Local development में mock OTP default है; production में real provider configure करें।
- Default/example secrets केवल development के लिए हैं; production में इन्हें बदलना अनिवार्य है।
- Database schema बदलने के बाद Prisma generate और database push/migration process चलाएँ।
- Admin actions को production में audit logging, least-privilege roles और HTTPS के साथ deploy करें।
